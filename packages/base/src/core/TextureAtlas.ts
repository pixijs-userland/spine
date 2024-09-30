import { ALPHA_MODES, MIPMAP_MODES, Rectangle, SCALE_MODES, Texture } from '@pixi/core';
import { filterFromString, TextureFilter, TextureRegion, TextureWrap } from './TextureRegion';

import type { BaseTexture } from '@pixi/core';
import type { Disposable, StringMap } from './Utils';

class RegionFields {
    x = 0;
    y = 0;
    width = 0;
    height = 0;
    offsetX = 0;
    offsetY = 0;
    originalWidth = 0;
    originalHeight = 0;
    rotate = 0;
    index = 0;
}
/**
 * @public
 */
export class TextureAtlas implements Disposable {
    pages = new Array<TextureAtlasPage>();
    regions = new Array<TextureAtlasRegion>();

    constructor(atlasText?: string, textureLoader?: (path: string, loaderFunction: (tex: BaseTexture) => any) => any, callback?: (obj: TextureAtlas) => any) {
        if (atlasText) {
            this.addSpineAtlas(atlasText, textureLoader, callback);
        }
    }

    addTexture(name: string, texture: Texture) {
        const pages = this.pages;
        let page: TextureAtlasPage = null;

        for (let i = 0; i < pages.length; i++) {
            if (pages[i].baseTexture === texture.baseTexture) {
                page = pages[i];
                break;
            }
        }
        if (page === null) {
            page = new TextureAtlasPage();
            page.name = 'texturePage';
            const baseTexture = texture.baseTexture;

            page.width = baseTexture.realWidth;
            page.height = baseTexture.realHeight;
            page.baseTexture = baseTexture;
            // those fields are not relevant in Pixi
            page.minFilter = page.magFilter = TextureFilter.Nearest;
            page.uWrap = TextureWrap.ClampToEdge;
            page.vWrap = TextureWrap.ClampToEdge;
            pages.push(page);
        }
        const region = new TextureAtlasRegion();

        region.name = name;
        region.page = page;
        region.texture = texture;
        region.index = -1;
        this.regions.push(region);

        return region;
    }

    addTextureHash(textures: StringMap<Texture>, stripExtension: boolean) {
        for (const key in textures) {
            if (textures.hasOwnProperty(key)) {
                this.addTexture(stripExtension && key.indexOf('.') !== -1 ? key.substr(0, key.lastIndexOf('.')) : key, textures[key]);
            }
        }
    }

    public addSpineAtlas(atlasText: string, textureLoader: (path: string, loaderFunction: (tex: BaseTexture) => any) => any, callback: (obj: TextureAtlas) => any) {
        return this.load(atlasText, textureLoader, callback);
    }

    private load(atlasText: string, textureLoader: (path: string, loaderFunction: (tex: BaseTexture) => any) => any, callback: (obj: TextureAtlas) => any) {
        if (textureLoader == null) {
            throw new Error('textureLoader cannot be null.');
        }

        const reader = new TextureAtlasReader(atlasText);
        const entry = new Array<string>(4);
        let page: TextureAtlasPage = null;
        const pageFields: StringMap<Function> = {};
        let region: RegionFields = null;

        pageFields.size = () => {
            page.width = parseInt(entry[1]);
            page.height = parseInt(entry[2]);
        };
        pageFields.format = () => {
            // page.format = Format[tuple[0]]; we don't need format in WebGL
        };
        pageFields.filter = () => {
            page.minFilter = filterFromString(entry[1]);
            page.magFilter = filterFromString(entry[2]);
        };
        pageFields.repeat = () => {
            if (entry[1].indexOf('x') != -1) page.uWrap = TextureWrap.Repeat;
            if (entry[1].indexOf('y') != -1) page.vWrap = TextureWrap.Repeat;
        };
        pageFields.pma = () => {
            page.pma = entry[1] == 'true';
        };

        const regionFields: StringMap<Function> = {};

        regionFields.xy = () => {
            // Deprecated, use bounds.
            region.x = parseInt(entry[1]);
            region.y = parseInt(entry[2]);
        };
        regionFields.size = () => {
            // Deprecated, use bounds.
            region.width = parseInt(entry[1]);
            region.height = parseInt(entry[2]);
        };
        regionFields.bounds = () => {
            region.x = parseInt(entry[1]);
            region.y = parseInt(entry[2]);
            region.width = parseInt(entry[3]);
            region.height = parseInt(entry[4]);
        };
        regionFields.offset = () => {
            // Deprecated, use offsets.
            region.offsetX = parseInt(entry[1]);
            region.offsetY = parseInt(entry[2]);
        };
        regionFields.orig = () => {
            // Deprecated, use offsets.
            region.originalWidth = parseInt(entry[1]);
            region.originalHeight = parseInt(entry[2]);
        };
        regionFields.offsets = () => {
            region.offsetX = parseInt(entry[1]);
            region.offsetY = parseInt(entry[2]);
            region.originalWidth = parseInt(entry[3]);
            region.originalHeight = parseInt(entry[4]);
        };
        regionFields.rotate = () => {
            const rotateValue = entry[1];
            let rotate = 0;

            if (rotateValue.toLocaleLowerCase() == 'true') {
                rotate = 6;
            } else if (rotateValue.toLocaleLowerCase() == 'false') {
                rotate = 0;
            } else {
                rotate = ((720 - parseFloat(rotateValue)) % 360) / 45;
            }
            region.rotate = rotate;
        };
        regionFields.index = () => {
            region.index = parseInt(entry[1]);
        };

        let line = reader.readLine();
        // Ignore empty lines before first entry.

        while (line != null && line.trim().length == 0) {
            line = reader.readLine();
        }
        // Header entries.
        while (true) {
            if (line == null || line.trim().length == 0) break;
            if (reader.readEntry(entry, line) == 0) break; // Silently ignore all header fields.
            line = reader.readLine();
        }

        const iterateParser = () => {
            while (true) {
                if (line == null) {
                    return callback && callback(this);
                }
                if (line.trim().length == 0) {
                    page = null;
                    line = reader.readLine();
                } else if (page === null) {
                    page = new TextureAtlasPage();
                    page.name = line.trim();

                    while (true) {
                        if (reader.readEntry(entry, (line = reader.readLine())) == 0) break;
                        const field: Function = pageFields[entry[0]];

                        if (field) field();
                    }
                    this.pages.push(page);

                    textureLoader(page.name, (texture: BaseTexture) => {
                        if (texture === null) {
                            this.pages.splice(this.pages.indexOf(page), 1);

                            return callback && callback(null);
                        }
                        page.baseTexture = texture;
                        // TODO: set scaleMode and mipmapMode from spine
                        if (page.pma) {
                            texture.alphaMode = ALPHA_MODES.PMA;
                        }
                        if (!texture.valid) {
                            texture.setSize(page.width, page.height);
                        }
                        page.setFilters();

                        if (!page.width || !page.height) {
                            page.width = texture.realWidth;
                            page.height = texture.realHeight;
                            if (!page.width || !page.height) {
                                console.log(
                                    `ERROR spine atlas page ${page.name}: meshes wont work if you dont specify size in atlas (http://www.html5gamedevs.com/topic/18888-pixi-spines-and-meshes/?p=107121)`
                                );
                            }
                        }
                        iterateParser();
                    });
                    break;
                } else {
                    region = new RegionFields();
                    const atlasRegion = new TextureAtlasRegion();

                    atlasRegion.name = line;
                    atlasRegion.page = page;
                    let names: string[] = null;
                    let values: number[][] = null;

                    while (true) {
                        const count = reader.readEntry(entry, (line = reader.readLine()));

                        if (count == 0) break;
                        const field: Function = regionFields[entry[0]];

                        if (field) {
                            field();
                        } else {
                            if (names == null) {
                                names = [];
                                values = [];
                            }
                            names.push(entry[0]);
                            const entryValues: number[] = [];

                            for (let i = 0; i < count; i++) {
                                entryValues.push(parseInt(entry[i + 1]));
                            }
                            values.push(entryValues);
                        }
                    }
                    if (region.originalWidth == 0 && region.originalHeight == 0) {
                        region.originalWidth = region.width;
                        region.originalHeight = region.height;
                    }

                    const resolution = page.baseTexture.resolution;

                    region.x /= resolution;
                    region.y /= resolution;
                    region.width /= resolution;
                    region.height /= resolution;
                    region.originalWidth /= resolution;
                    region.originalHeight /= resolution;
                    region.offsetX /= resolution;
                    region.offsetY /= resolution;

                    const swapWH = region.rotate % 4 !== 0;
                    const frame = new Rectangle(region.x, region.y, swapWH ? region.height : region.width, swapWH ? region.width : region.height);

                    const orig = new Rectangle(0, 0, region.originalWidth, region.originalHeight);
                    const trim = new Rectangle(region.offsetX, region.originalHeight - region.height - region.offsetY, region.width, region.height);

                    atlasRegion.texture = new Texture(atlasRegion.page.baseTexture, frame, orig, trim, region.rotate);
                    atlasRegion.index = region.index;
                    atlasRegion.texture.updateUvs();

                    this.regions.push(atlasRegion);
                }
            }
        };

        iterateParser();
    }

    findRegion(name: string): TextureAtlasRegion {
        for (let i = 0; i < this.regions.length; i++) {
            if (this.regions[i].name == name) {
                return this.regions[i];
            }
        }

        return null;
    }

    dispose() {
        for (let i = 0; i < this.pages.length; i++) {
            this.pages[i].baseTexture.dispose();
        }
    }
}

/**
 * @public
 */
class TextureAtlasReader {
    lines: Array<string>;
    index = 0;

    constructor(text: string) {
        this.lines = text.split(/\r\n|\r|\n/);
    }

    readLine(): string {
        if (this.index >= this.lines.length) {
            return null;
        }

        return this.lines[this.index++];
    }

    readEntry(entry: string[], line: string): number {
        if (line == null) return 0;
        line = line.trim();
        if (line.length == 0) return 0;

        const colon = line.indexOf(':');

        if (colon == -1) return 0;
        entry[0] = line.substr(0, colon).trim();
        for (let i = 1, lastMatch = colon + 1; ; i++) {
            const comma = line.indexOf(',', lastMatch);

            if (comma == -1) {
                entry[i] = line.substr(lastMatch).trim();

                return i;
            }
            entry[i] = line.substr(lastMatch, comma - lastMatch).trim();
            lastMatch = comma + 1;
            if (i == 4) return 4;
        }
    }
}

/**
 * @public
 */
export class TextureAtlasPage {
    name: string;
    minFilter: TextureFilter = TextureFilter.Nearest;
    magFilter: TextureFilter = TextureFilter.Nearest;
    uWrap: TextureWrap = TextureWrap.ClampToEdge;
    vWrap: TextureWrap = TextureWrap.ClampToEdge;
    baseTexture: BaseTexture;
    width: number;
    height: number;
    pma: boolean;

    public setFilters() {
        const tex = this.baseTexture;
        const filter = this.minFilter;

        if (filter == TextureFilter.Linear) {
            tex.scaleMode = SCALE_MODES.LINEAR;
        } else if (this.minFilter == TextureFilter.Nearest) {
            tex.scaleMode = SCALE_MODES.NEAREST;
        } else {
            tex.mipmap = MIPMAP_MODES.POW2;
            if (filter == TextureFilter.MipMapNearestNearest) {
                tex.scaleMode = SCALE_MODES.NEAREST;
            } else {
                tex.scaleMode = SCALE_MODES.LINEAR;
            }
        }
    }
}

/**
 * @public
 */
export class TextureAtlasRegion extends TextureRegion {
    page: TextureAtlasPage;
    name: string;
    index: number;
}
