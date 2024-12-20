import { AttachmentType } from './core/AttachmentType';
import { TextureRegion } from './core/TextureRegion';
import { MathUtils } from './core/Utils';
import type { IAnimationState, IAnimationStateData } from './core/IAnimation';
import type { IAttachment, IClippingAttachment, IMeshAttachment, IRegionAttachment, ISkeleton, ISkeletonData, ISlot, IVertexAttachment } from './core/ISkeleton';
import { DRAW_MODES, Rectangle, Polygon, Transform, Texture, utils } from '@pixi/core';
import { Container, DisplayObject } from '@pixi/display';
import { Sprite } from '@pixi/sprite';
import { SimpleMesh } from '@pixi/mesh-extras';
import { Graphics } from '@pixi/graphics';
import { settings } from './settings';
import type { ISpineDebugRenderer } from './SpineDebugRenderer';
import { Color } from '@pixi/color';

const tempRgb = [0, 0, 0];

/**
 * @public
 */
export interface ISpineDisplayObject extends DisplayObject {
    region?: TextureRegion;
    attachment?: IAttachment;
}

/**
 * @public
 */
export class SpineSprite extends Sprite implements ISpineDisplayObject {
    region?: TextureRegion = null;
    attachment?: IAttachment = null;
}

/**
 * @public
 */
export class SpineMesh extends SimpleMesh implements ISpineDisplayObject {
    region?: TextureRegion = null;
    attachment?: IAttachment = null;

    constructor(texture: Texture, vertices?: Float32Array, uvs?: Float32Array, indices?: Uint16Array, drawMode?: number) {
        super(texture, vertices, uvs, indices, drawMode);
    }
}

/**
 * A class that enables the you to import and run your spine animations in pixi.
 * The Spine animation data needs to be loaded using either the Loader or a SpineLoader before it can be used by this class
 * See example 12 (http://www.goodboydigital.com/pixijs/examples/12/) to see a working example and check out the source
 *
 * ```js
 * let spineAnimation = new spine(spineData);
 * ```
 *
 * @public
 * @class
 * @extends Container
 * @memberof spine
 * @param spineData {object} The spine data loaded from a spine atlas.
 */
export abstract class SpineBase<
        Skeleton extends ISkeleton,
        SkeletonData extends ISkeletonData,
        AnimationState extends IAnimationState,
        AnimationStateData extends IAnimationStateData
    >
    extends Container
    implements GlobalMixins.Spine
{
    tintRgb: ArrayLike<number>;
    spineData: SkeletonData;
    skeleton: Skeleton;
    stateData: AnimationStateData;
    state: AnimationState;
    slotContainers: Array<Container>;
    tempClipContainers: Array<Container>;
    localDelayLimit: number;
    private _autoUpdate: boolean;
    protected _visible: boolean;
    private _debug: ISpineDebugRenderer;
    public get debug(): ISpineDebugRenderer {
        return this._debug;
    }
    public set debug(value: ISpineDebugRenderer) {
        if (value == this._debug) {
            // soft equality allows null == undefined
            return;
        }
        this._debug?.unregisterSpine(this);
        value?.registerSpine(this);
        this._debug = value;
    }

    abstract createSkeleton(spineData: ISkeletonData);

    constructor(spineData: SkeletonData) {
        super();

        if (!spineData) {
            throw new Error('The spineData param is required.');
        }

        if (typeof spineData === 'string') {
            throw new Error('spineData param cant be string. Please use spine.Spine.fromAtlas("YOUR_RESOURCE_NAME") from now on.');
        }

        /**
         * The spineData object
         *
         * @member {object}
         */
        this.spineData = spineData;

        /**
         * A spine Skeleton object
         *
         * @member {object}
         */
        this.createSkeleton(spineData);

        /**
         * An array of containers
         *
         * @member {Container[]}
         */
        this.slotContainers = [];

        this.tempClipContainers = [];

        for (let i = 0, n = this.skeleton.slots.length; i < n; i++) {
            const slot = this.skeleton.slots[i];
            const attachment: any = slot.getAttachment();
            const slotContainer = this.newContainer();

            this.slotContainers.push(slotContainer);
            this.addChild(slotContainer);
            this.tempClipContainers.push(null);

            if (!attachment) {
                continue;
            }
            if (attachment.type === AttachmentType.Region) {
                const spriteName = attachment.name;
                const sprite = this.createSprite(slot, attachment as IRegionAttachment, spriteName);

                slot.currentSprite = sprite;
                slot.currentSpriteName = spriteName;
                slotContainer.addChild(sprite);
            } else if (attachment.type === AttachmentType.Mesh) {
                const mesh = this.createMesh(slot, attachment);

                slot.currentMesh = mesh;
                slot.currentMeshId = attachment.id;
                slot.currentMeshName = attachment.name;
                slotContainer.addChild(mesh);
            } else if (attachment.type === AttachmentType.Clipping) {
                this.createGraphics(slot, attachment);
                slotContainer.addChild(slot.clippingContainer);
                slotContainer.addChild(slot.currentGraphics);
            }
        }

        /**
         * The tint applied to all spine slots. This is a [r,g,b] value. A value of [1,1,1] will remove any tint effect.
         *
         * @member {number}
         * @memberof spine.Spine#
         */
        this.tintRgb = new Float32Array([1, 1, 1]);

        this.autoUpdate = true;
        this.visible = true;
    }

    /**
     * If this flag is set to true, the spine animation will be automatically updated every
     * time the object id drawn. The down side of this approach is that the delta time is
     * automatically calculated and you could miss out on cool effects like slow motion,
     * pause, skip ahead and the sorts. Most of these effects can be achieved even with
     * autoUpdate enabled but are harder to achieve.
     *
     * @member {boolean}
     * @memberof spine.Spine#
     * @default true
     */
    get autoUpdate(): boolean {
        return this._autoUpdate;
    }

    set autoUpdate(value: boolean) {
        if (value !== this._autoUpdate) {
            this._autoUpdate = value;
            this.updateTransform = value ? SpineBase.prototype.autoUpdateTransform : Container.prototype.updateTransform;
        }
    }

    /**
     * The tint applied to the spine object. This is a hex value. A value of 0xFFFFFF will remove any tint effect.
     *
     * @member {number}
     * @memberof spine.Spine#
     * @default 0xFFFFFF
     */
    get tint(): number {
        return Color.shared.setValue(Array.from(this.tintRgb)).toNumber();
    }

    set tint(value: number) {
        this.tintRgb = utils.hex2rgb(value, this.tintRgb as any);
    }

    /**
     * Limit value for the update dt with Spine.globalDelayLimit
     * that can be overridden with localDelayLimit
     * @return {number} - Maximum processed dt value for the update
     */
    get delayLimit(): number {
        const limit = typeof this.localDelayLimit !== 'undefined' ? this.localDelayLimit : settings.GLOBAL_DELAY_LIMIT;

        // If limit is 0, this means there is no limit for the delay
        return limit || Number.MAX_VALUE;
    }

    /**
     * Update the spine skeleton and its animations by delta time (dt)
     *
     * @param dt {number} Delta time. Time by which the animation should be updated
     */
    update(dt: number) {
        // Limit delta value to avoid animation jumps
        const delayLimit = this.delayLimit;

        if (dt > delayLimit) dt = delayLimit;

        this.state.update(dt);
        this.state.apply(this.skeleton);

        // check we haven't been destroyed via a spine event callback in state update
        if (!this.skeleton) {
            return;
        }

        this.skeleton.updateWorldTransform();

        const slots = this.skeleton.slots;

        // in case pixi has double tint
        const globalClr = (this as any).color;
        let light: ArrayLike<number> = null;
        let dark: ArrayLike<number> = null;

        if (globalClr) {
            light = globalClr.light;
            dark = globalClr.dark;
        } else {
            light = this.tintRgb;
        }

        // let thack = false;

        for (let i = 0, n = slots.length; i < n; i++) {
            const slot = slots[i];
            const attachment = slot.getAttachment();
            const slotContainer = this.slotContainers[i];

            if (!attachment) {
                slotContainer.visible = false;
                continue;
            }

            let spriteColor: any = null;

            if (attachment.sequence) {
                attachment.sequence.apply(slot, attachment as any);
            }
            let region = (attachment as IRegionAttachment).region;

            const attColor = (attachment as any).color;

            switch (attachment != null && attachment.type) {
                case AttachmentType.Region:
                    const transform = slotContainer.transform;

                    transform.setFromMatrix(slot.bone.matrix);

                    region = (attachment as IRegionAttachment).region;
                    if (slot.currentMesh) {
                        slot.currentMesh.visible = false;
                        slot.currentMesh = null;
                        slot.currentMeshId = undefined;
                        slot.currentMeshName = undefined;
                    }
                    if (!region) {
                        if (slot.currentSprite) {
                            slot.currentSprite.renderable = false;
                        }
                        break;
                    }
                    if (!slot.currentSpriteName || slot.currentSpriteName !== attachment.name) {
                        const spriteName = attachment.name;

                        if (slot.currentSprite) {
                            slot.currentSprite.visible = false;
                        }
                        slot.sprites = slot.sprites || {};
                        if (slot.sprites[spriteName] !== undefined) {
                            slot.sprites[spriteName].visible = true;
                        } else {
                            const sprite = this.createSprite(slot, attachment as IRegionAttachment, spriteName);

                            slotContainer.addChild(sprite);
                        }
                        slot.currentSprite = slot.sprites[spriteName];
                        slot.currentSpriteName = spriteName;

                        // force sprite update when attachment name is same.
                        // issues https://github.com/pixijs/pixi-spine/issues/318
                    }
                    slot.currentSprite.renderable = true;
                    if (!slot.hackRegion) {
                        this.setSpriteRegion(attachment as IRegionAttachment, slot.currentSprite, region);
                    }
                    if (slot.currentSprite.color) {
                        // YAY! double - tint!
                        spriteColor = slot.currentSprite.color;
                    } else {
                        tempRgb[0] = light[0] * slot.color.r * attColor.r;
                        tempRgb[1] = light[1] * slot.color.g * attColor.g;
                        tempRgb[2] = light[2] * slot.color.b * attColor.b;
                        slot.currentSprite.tint = Color.shared.setValue(tempRgb).toNumber();
                    }
                    slot.currentSprite.blendMode = slot.blendMode;
                    break;

                case AttachmentType.Mesh:
                    if (slot.currentSprite) {
                        // TODO: refactor this thing, switch it on and off for container
                        slot.currentSprite.visible = false;
                        slot.currentSprite = null;
                        slot.currentSpriteName = undefined;

                        // TODO: refactor this shit
                        const transform = new Transform();

                        (transform as any)._parentID = -1;
                        (transform as any)._worldID = (slotContainer.transform as any)._worldID;
                        slotContainer.transform = transform;
                    }
                    if (!region) {
                        if (slot.currentMesh) {
                            slot.currentMesh.renderable = false;
                        }
                        break;
                    }

                    const id = (attachment as IVertexAttachment).id;

                    if (slot.currentMeshId === undefined || slot.currentMeshId !== id) {
                        const meshId = id;

                        if (slot.currentMesh) {
                            slot.currentMesh.visible = false;
                        }

                        slot.meshes = slot.meshes || {};

                        if (slot.meshes[meshId] !== undefined) {
                            slot.meshes[meshId].visible = true;
                        } else {
                            const mesh = this.createMesh(slot, attachment as IMeshAttachment);

                            slotContainer.addChild(mesh);
                        }

                        slot.currentMesh = slot.meshes[meshId];
                        slot.currentMeshName = attachment.name;
                        slot.currentMeshId = meshId;
                    }
                    slot.currentMesh.renderable = true;
                    (attachment as IVertexAttachment).computeWorldVerticesOld(slot, slot.currentMesh.vertices);
                    if (slot.currentMesh.color) {
                        // pixi-heaven
                        spriteColor = slot.currentMesh.color;
                    } else {
                        tempRgb[0] = light[0] * slot.color.r * attColor.r;
                        tempRgb[1] = light[1] * slot.color.g * attColor.g;
                        tempRgb[2] = light[2] * slot.color.b * attColor.b;
                        slot.currentMesh.tint = Color.shared.setValue(tempRgb).toNumber();
                    }
                    slot.currentMesh.blendMode = slot.blendMode;
                    if (!slot.hackRegion) {
                        this.setMeshRegion(attachment as IMeshAttachment, slot.currentMesh, region);
                    }
                    break;
                case AttachmentType.Clipping:
                    if (!slot.currentGraphics) {
                        this.createGraphics(slot, attachment as IClippingAttachment);
                        slotContainer.addChild(slot.clippingContainer);
                        slotContainer.addChild(slot.currentGraphics);
                    }
                    this.updateGraphics(slot, attachment as IClippingAttachment);
                    slotContainer.alpha = 1.0;
                    slotContainer.visible = true;
                    continue;
                default:
                    slotContainer.visible = false;
                    continue;
            }
            slotContainer.visible = true;

            // pixi has double tint
            if (spriteColor) {
                let r0 = slot.color.r * attColor.r;
                let g0 = slot.color.g * attColor.g;
                let b0 = slot.color.b * attColor.b;

                // YAY! double-tint!
                spriteColor.setLight(light[0] * r0 + dark[0] * (1.0 - r0), light[1] * g0 + dark[1] * (1.0 - g0), light[2] * b0 + dark[2] * (1.0 - b0));
                if (slot.darkColor) {
                    r0 = slot.darkColor.r;
                    g0 = slot.darkColor.g;
                    b0 = slot.darkColor.b;
                } else {
                    r0 = 0.0;
                    g0 = 0.0;
                    b0 = 0.0;
                }
                spriteColor.setDark(light[0] * r0 + dark[0] * (1 - r0), light[1] * g0 + dark[1] * (1 - g0), light[2] * b0 + dark[2] * (1 - b0));
            }

            slotContainer.alpha = slot.color.a;
        }

        // == this is clipping implementation ===
        // TODO: remove parent hacks when pixi masks allow it
        const drawOrder = this.skeleton.drawOrder;
        let clippingAttachment: IClippingAttachment = null;
        let clippingContainer: Container = null;

        for (let i = 0, n = drawOrder.length; i < n; i++) {
            const slot = slots[drawOrder[i].data.index];
            const slotContainer = this.slotContainers[drawOrder[i].data.index];

            if (!clippingContainer) {
                // Adding null check as it is possible for slotContainer.parent to be null in the event of a spine being disposed off in its loop callback
                if (slotContainer.parent !== null && slotContainer.parent !== this) {
                    slotContainer.parent.removeChild(slotContainer);
                    // silend add hack
                    (slotContainer as any).parent = this;
                }
            }
            if (slot.currentGraphics && slot.getAttachment()) {
                clippingContainer = slot.clippingContainer;
                clippingAttachment = slot.getAttachment() as IClippingAttachment;
                clippingContainer.children.length = 0;
                this.children[i] = slotContainer;

                if (clippingAttachment.endSlot === slot.data) {
                    clippingAttachment.endSlot = null;
                }
            } else if (clippingContainer) {
                let c = this.tempClipContainers[i];

                if (!c) {
                    c = this.tempClipContainers[i] = this.newContainer();
                    c.visible = false;
                }
                this.children[i] = c;

                // silent remove hack
                (slotContainer as any).parent = null;
                clippingContainer.addChild(slotContainer);
                if (clippingAttachment.endSlot == slot.data) {
                    clippingContainer.renderable = true;
                    clippingContainer = null;
                    clippingAttachment = null;
                }
            } else {
                this.children[i] = slotContainer;
            }
        }

        // if you can debug, then debug!
        this._debug?.renderDebug(this);
    }

    private setSpriteRegion(attachment: IRegionAttachment, sprite: SpineSprite, region: TextureRegion) {
        // prevent setters calling when attachment and region is same
        if (sprite.attachment === attachment && sprite.region === region) {
            return;
        }

        sprite.region = region;
        sprite.attachment = attachment;

        sprite.texture = region.texture;
        sprite.rotation = attachment.rotation * MathUtils.degRad;
        sprite.position.x = attachment.x;
        sprite.position.y = attachment.y;
        sprite.alpha = attachment.color.a;

        if (!region.size) {
            sprite.scale.x = (attachment.scaleX * attachment.width) / region.originalWidth;
            sprite.scale.y = (-attachment.scaleY * attachment.height) / region.originalHeight;
        } else {
            // hacked!
            sprite.scale.x = region.size.width / region.originalWidth;
            sprite.scale.y = -region.size.height / region.originalHeight;
        }
    }

    private setMeshRegion(attachment: IMeshAttachment, mesh: SpineMesh, region: TextureRegion) {
        if (mesh.attachment === attachment && mesh.region === region) {
            return;
        }

        mesh.region = region;
        mesh.attachment = attachment;
        mesh.texture = region.texture;
        region.texture.updateUvs();
        mesh.uvBuffer.update(attachment.regionUVs);
    }

    protected lastTime: number;

    /**
     * When autoupdate is set to yes this function is used as pixi's updateTransform function
     *
     * @private
     */
    autoUpdateTransform() {
        if (settings.GLOBAL_AUTO_UPDATE) {
            this.lastTime = this.lastTime || Date.now();
            const timeDelta = (Date.now() - this.lastTime) * 0.001;

            this.lastTime = Date.now();
            this.update(timeDelta);
        } else {
            this.lastTime = 0;
        }

        Container.prototype.updateTransform.call(this);
    }

    /**
     * Create a new sprite to be used with core.RegionAttachment
     *
     * @param slot {spine.Slot} The slot to which the attachment is parented
     * @param attachment {spine.RegionAttachment} The attachment that the sprite will represent
     * @private
     */
    createSprite(slot: ISlot, attachment: IRegionAttachment, defName: string) {
        let region = attachment.region;

        if (slot.hackAttachment === attachment) {
            region = slot.hackRegion;
        }
        const texture = region ? region.texture : null;
        const sprite = this.newSprite(texture);

        sprite.anchor.set(0.5);
        if (region) {
            this.setSpriteRegion(attachment, sprite, attachment.region);
        }

        slot.sprites = slot.sprites || {};
        slot.sprites[defName] = sprite;

        return sprite;
    }

    /**
     * Creates a Strip from the spine data
     * @param slot {spine.Slot} The slot to which the attachment is parented
     * @param attachment {spine.RegionAttachment} The attachment that the sprite will represent
     * @private
     */
    createMesh(slot: ISlot, attachment: IMeshAttachment) {
        let region = attachment.region;

        if (slot.hackAttachment === attachment) {
            region = slot.hackRegion;
            slot.hackAttachment = null;
            slot.hackRegion = null;
        }
        const strip = this.newMesh(
            region ? region.texture : null,
            new Float32Array(attachment.regionUVs.length),
            attachment.regionUVs,
            new Uint16Array(attachment.triangles),
            DRAW_MODES.TRIANGLES
        );

        if (typeof (strip as any)._canvasPadding !== 'undefined') {
            (strip as any)._canvasPadding = 1.5;
        }

        strip.alpha = attachment.color.a;

        strip.region = attachment.region;
        if (region) {
            this.setMeshRegion(attachment, strip, region);
        }

        slot.meshes = slot.meshes || {};
        slot.meshes[attachment.id] = strip;

        return strip;
    }

    static clippingPolygon: Array<number> = [];

    // @ts-ignore
    createGraphics(slot: ISlot, clip: IClippingAttachment) {
        const graphics = this.newGraphics();
        const poly = new Polygon([]);

        graphics.clear();
        graphics.beginFill(0xffffff, 1);
        graphics.drawPolygon(poly as any);
        graphics.renderable = false;
        slot.currentGraphics = graphics;
        slot.clippingContainer = this.newContainer();
        slot.clippingContainer.mask = slot.currentGraphics;

        return graphics;
    }

    updateGraphics(slot: ISlot, clip: IClippingAttachment) {
        const geom = slot.currentGraphics.geometry;
        const vertices = (geom.graphicsData[0].shape as Polygon).points;
        const n = clip.worldVerticesLength;

        vertices.length = n;
        clip.computeWorldVertices(slot, 0, n, vertices, 0, 2);
        geom.invalidate();
    }

    /**
     * Changes texture in attachment in specific slot.
     *
     * PIXI runtime feature, it was made to satisfy our users.
     *
     * @param slotIndex {number}
     * @param [texture = null] {PIXI.Texture} If null, take default (original) texture
     * @param [size = null] {PIXI.Point} sometimes we need new size for region attachment, you can pass 'texture.orig' there
     * @returns {boolean} Success flag
     */
    hackTextureBySlotIndex(slotIndex: number, texture: Texture = null, size: Rectangle = null) {
        const slot = this.skeleton.slots[slotIndex];

        if (!slot) {
            return false;
        }
        const attachment: any = slot.getAttachment();
        let region: TextureRegion = attachment.region;

        if (texture) {
            region = new TextureRegion();
            region.texture = texture;
            region.size = size;
            slot.hackRegion = region;
            slot.hackAttachment = attachment;
        } else {
            slot.hackRegion = null;
            slot.hackAttachment = null;
        }
        if (slot.currentSprite) {
            this.setSpriteRegion(attachment, slot.currentSprite, region);
        } else if (slot.currentMesh) {
            this.setMeshRegion(attachment, slot.currentMesh, region);
        }

        return true;
    }

    /**
     * Changes texture in attachment in specific slot.
     *
     * PIXI runtime feature, it was made to satisfy our users.
     *
     * @param slotName {string}
     * @param [texture = null] {PIXI.Texture} If null, take default (original) texture
     * @param [size = null] {PIXI.Point} sometimes we need new size for region attachment, you can pass 'texture.orig' there
     * @returns {boolean} Success flag
     */
    hackTextureBySlotName(slotName: string, texture: Texture = null, size: Rectangle = null) {
        const index = this.skeleton.findSlotIndex(slotName);

        if (index == -1) {
            return false;
        }

        return this.hackTextureBySlotIndex(index, texture, size);
    }

    /**
     * Changes texture of an attachment
     *
     * PIXI runtime feature, it was made to satisfy our users.
     *
     * @param slotName {string}
     * @param attachmentName {string}
     * @param [texture = null] {PIXI.Texture} If null, take default (original) texture
     * @param [size = null] {PIXI.Point} sometimes we need new size for region attachment, you can pass 'texture.orig' there
     * @returns {boolean} Success flag
     */
    hackTextureAttachment(slotName: string, attachmentName: string, texture, size: Rectangle = null) {
        // changes the texture of an attachment at the skeleton level
        const slotIndex = this.skeleton.findSlotIndex(slotName);
        const attachment: any = this.skeleton.getAttachmentByName(slotName, attachmentName);

        attachment.region.texture = texture;

        const slot = this.skeleton.slots[slotIndex];

        if (!slot) {
            return false;
        }

        // gets the currently active attachment in this slot
        const currentAttachment: any = slot.getAttachment();

        if (attachmentName === currentAttachment.name) {
            // if the attachment we are changing is currently active, change the the live texture
            let region: TextureRegion = attachment.region;

            if (texture) {
                region = new TextureRegion();
                region.texture = texture;
                region.size = size;
                slot.hackRegion = region;
                slot.hackAttachment = currentAttachment;
            } else {
                slot.hackRegion = null;
                slot.hackAttachment = null;
            }
            if (slot.currentSprite && slot.currentSprite.region != region) {
                this.setSpriteRegion(currentAttachment, slot.currentSprite, region);
                slot.currentSprite.region = region;
            } else if (slot.currentMesh && slot.currentMesh.region != region) {
                this.setMeshRegion(currentAttachment, slot.currentMesh, region);
            }

            return true;
        }

        return false;
    }

    // those methods can be overriden to spawn different classes
    newContainer() {
        return new Container();
    }

    newSprite(tex: Texture) {
        return new SpineSprite(tex);
    }

    newGraphics() {
        return new Graphics();
    }

    newMesh(texture: Texture, vertices?: Float32Array, uvs?: Float32Array, indices?: Uint16Array, drawMode?: number) {
        return new SpineMesh(texture, vertices, uvs, indices, drawMode);
    }

    transformHack() {
        return 1;
    }

    /**
     * Hack for pixi-display and pixi-lights. Every attachment name ending with a suffix will be added to different layer
     * @param nameSuffix
     * @param group
     * @param outGroup
     */
    hackAttachmentGroups(nameSuffix: string, group: any, outGroup: any) {
        if (!nameSuffix) {
            return undefined;
        }
        const list_d = [];
        const list_n = [];

        for (let i = 0, len = this.skeleton.slots.length; i < len; i++) {
            const slot = this.skeleton.slots[i];
            const name = slot.currentSpriteName || slot.currentMeshName || '';
            const target = slot.currentSprite || slot.currentMesh;

            if (name.endsWith(nameSuffix)) {
                target.parentGroup = group;
                list_n.push(target);
            } else if (outGroup && target) {
                target.parentGroup = outGroup;
                list_d.push(target);
            }
        }

        return [list_d, list_n];
    }

    destroy(options?: any): void {
        this.debug = null; // setter will do the cleanup

        for (let i = 0, n = this.skeleton.slots.length; i < n; i++) {
            const slot = this.skeleton.slots[i];

            for (const name in slot.meshes) {
                slot.meshes[name].destroy(options);
            }
            slot.meshes = null;

            for (const name in slot.sprites) {
                slot.sprites[name].destroy(options);
            }
            slot.sprites = null;
        }

        for (let i = 0, n = this.slotContainers.length; i < n; i++) {
            this.slotContainers[i].destroy(options);
        }
        this.spineData = null;
        this.skeleton = null;
        this.slotContainers = null;
        this.stateData = null;
        this.state = null;
        this.tempClipContainers = null;

        super.destroy(options);
    }
}

/**
 * The visibility of the spine object. If false the object will not be drawn,
 * the updateTransform function will not be called, and the spine will not be automatically updated.
 *
 * @member {boolean}
 * @memberof spine.Spine#
 * @default true
 */
Object.defineProperty(SpineBase.prototype, 'visible', {
    get() {
        return this._visible;
    },
    set(value: boolean) {
        if (value !== this._visible) {
            this._visible = value;
            if (value) {
                this.lastTime = 0;
            }
        }
    },
});
