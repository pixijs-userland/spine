import { AssetExtension, checkExtension, Loader, LoaderParserPriority, ResolvedAsset } from '@pixi/assets';
import { BaseTexture, extensions, ExtensionType, settings, Texture, utils } from '@pixi/core';
import { makeSpineTextureAtlasLoaderFunctionFromPixiLoaderObject } from './atlasLoader';
import { ISkeletonData, ISkeletonParser, TextureAtlas } from '@pixi-spine/base';

type SPINEJSON = any;
type SPINEBINARY = ArrayBuffer;

function isJson(resource: unknown): resource is SPINEJSON {
    return resource.hasOwnProperty('bones');
}

function isBuffer(resource: unknown): resource is SPINEBINARY {
    return resource instanceof ArrayBuffer;
}

/**
 * This abstract class is used to create a spine loader specifically for a needed version
 * @public
 */
export abstract class SpineLoaderAbstract<SKD extends ISkeletonData> {
    constructor() {}

    abstract createJsonParser(): ISkeletonParser;

    abstract createBinaryParser(): ISkeletonParser;

    abstract parseData(parser: ISkeletonParser, atlas: TextureAtlas, dataToParse: any): ISpineResource<SKD>;

    public installLoader(): any {
        // eslint-disable-next-line @typescript-eslint/no-this-alias
        console.log('installLoader');
        const spineAdapter = this;
        const spineLoaderExtension: AssetExtension<SPINEJSON | SPINEBINARY | ISpineResource<SKD>, ISpineMetadata> = {
            extension: ExtensionType.Asset,

            loader: {
                extension: {
                    type: ExtensionType.LoadParser,
                    priority: LoaderParserPriority.Normal,
                },

                // #region Downloading skel buffer data
                test(url) {
                    return checkExtension(url, '.skel');
                },

                async load<SPINEBINARY>(url: string): Promise<SPINEBINARY> {
                    const response = await settings.ADAPTER.fetch(url);

                    const buffer = await response.arrayBuffer();

                    return buffer as SPINEBINARY;
                },
                // #endregion

                // #region Parsing spine data
                testParse(asset: unknown, options: ResolvedAsset): Promise<boolean> {
                    const isJsonSpineModel = checkExtension(options.src, '.json') && isJson(asset);
                    const isBinarySpineModel = checkExtension(options.src, '.skel') && isBuffer(asset);

                    // From 6.x loader. If the atlas is strictly false we bail
                    const isMetadataAngry = options.data?.spineAtlas === false;

                    return Promise.resolve((isJsonSpineModel && !isMetadataAngry) || isBinarySpineModel);
                },

                async parse(asset: SPINEJSON | SPINEBINARY, loadAsset, loader): Promise<ISpineResource<SKD>> {
                    const fileExt = utils.path.extname(loadAsset.src).toLowerCase();
                    const fileName = utils.path.basename(loadAsset.src, fileExt);
                    let basePath = utils.path.dirname(loadAsset.src);

                    if (basePath && basePath.lastIndexOf('/') !== basePath.length - 1) {
                        basePath += '/';
                    }

                    const isJsonSpineModel = checkExtension(loadAsset.src, '.json') && isJson(asset);
                    // const isBinarySpineModel = fileExt === 'slel' && isBuffer(asset);

                    let parser: ISkeletonParser = null;
                    let dataToParse = asset;

                    if (isJsonSpineModel) {
                        parser = spineAdapter.createJsonParser();
                    } else {
                        parser = spineAdapter.createBinaryParser();
                        dataToParse = new Uint8Array(asset);
                    }

                    const metadata = (loadAsset.data || {}) as ISpineMetadata;
                    const metadataSkeletonScale = metadata?.spineSkeletonScale ?? null;

                    if (metadataSkeletonScale) {
                        parser.scale = metadataSkeletonScale;
                    }

                    // if metadataAtlas is a TextureAtlas, use it directly
                    const metadataAtlas: TextureAtlas = metadata.spineAtlas as TextureAtlas;

                    if (metadataAtlas && metadataAtlas.pages) {
                        return spineAdapter.parseData(parser, metadataAtlas, dataToParse);
                    }

                    // if for some odd reason, you dumped the text information of the atlas into the metadata...
                    const textAtlas = metadata.atlasRawData;

                    if (textAtlas) {
                        let auxResolve = null;
                        let auxReject = null;
                        const atlasPromise = new Promise<TextureAtlas>((resolve, reject) => {
                            auxResolve = resolve;
                            auxReject = reject;
                        });
                        const atlas = new TextureAtlas(textAtlas, makeSpineTextureAtlasLoaderFunctionFromPixiLoaderObject(loader, basePath, metadata.imageMetadata), (newAtlas) => {
                            if (!newAtlas) {
                                auxReject('Something went terribly wrong loading a spine .atlas file\nMost likely your texture failed to load.');
                            }
                            auxResolve(atlas);
                        });
                        const textureAtlas = await atlasPromise;

                        return spineAdapter.parseData(parser, textureAtlas, dataToParse);
                    }

                    // Maybe you told us where to find the file? (I sure hope you remembered to add the .atlas extension)
                    let atlasPath = metadata.spineAtlasFile;

                    // Finally, if no information at all about the atlas, we guess the atlas file name
                    if (!atlasPath) {
                        atlasPath = `${basePath + fileName}.atlas`;
                    }

                    const textureAtlas = await loader.load<TextureAtlas>({ src: atlasPath, data: metadata, alias: metadata.spineAtlasAlias });

                    return spineAdapter.parseData(parser, textureAtlas, dataToParse);
                },

                // #endregion

                // unload(asset: ISpineResource<SKD>, loadAsset, loader) {
                // 	???
                // },
            },
        } as AssetExtension<SPINEJSON | SPINEBINARY | ISpineResource<SKD>, ISpineMetadata>;

        extensions.add(spineLoaderExtension);

        return spineLoaderExtension;
    }
}

/**
 * The final spineData+spineAtlas object that can be used to create a Spine.
 * @public
 */
export interface ISpineResource<SKD extends ISkeletonData> {
    spineData: SKD;
    spineAtlas: TextureAtlas;
}

/**
 * Metadata for loading spine assets
 * @public
 */
export interface ISpineMetadata {
    // Passed directly to Spine's SkeletonJson/BinaryParser
    spineSkeletonScale?: number;
    // If you already have a TextureAtlas, you can pass it directly
    spineAtlas?: Partial<TextureAtlas>;
    // If you are going to download an .atlas file, you can specify an alias here for cache/future lookup
    spineAtlasAlias?: string[];
    // If you want to use a custom .atlas file, you can specify the path here. **It must be a .atlas file or you need your own parser!**
    spineAtlasFile?: string;
    // If for some reason, you have the raw text content of an .atlas file, and want to use it dump it here
    atlasRawData?: string;
    // If you are hardcore and can write your own loader function to load the textures for the atlas, you can pass it here
    imageLoader?: (loader: Loader, path: string) => (path: string, callback: (tex: BaseTexture) => any) => any;
    // If you are downloading an .atlas file, this metadata will go to the Texture loader
    imageMetadata?: any;
    // If you already have atlas pages loaded as pixi textures and want to use that to create the atlas, you can pass them here
    images?: Record<string, Texture | BaseTexture>;
    // If your spine only uses one atlas page and you have it as a pixi texture, you can pass it here
    image?: Texture | BaseTexture;
}
