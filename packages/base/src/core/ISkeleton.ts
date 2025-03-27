import type { AttachmentType } from './AttachmentType';
import type { IAnimation, IEventData } from './IAnimation';
import type { IIkConstraintData, IPathConstraintData, ITransformConstraintData } from './IConstraint';
import type { Color, Vector2, Map } from './Utils';
import type { TextureRegion } from './TextureRegion';
import type { BLEND_MODES, Matrix } from '@pixi/core';

// This enum was moved from BoneData.ts of spine 3.7, 3.8 and 4.0

/** Determines how a bone inherits world transforms from parent bones.
 * @public
 * */
export enum TransformMode {
    Normal,
    OnlyTranslation,
    NoRotationOrReflection,
    NoScale,
    NoScaleOrReflection,
}

/**
 * @public
 */
export interface IBone {
    data: IBoneData;
    matrix: Matrix;
    active: boolean;
}

/**
 * @public
 */
export interface ISkin {
    name: string;
    attachments: Array<Map<IAttachment>>;

    getAttachment(slotIndex: number, name: string): IAttachment | null;
}

/**
 * @public
 */
export interface IAttachment {
    name: string;
    type: AttachmentType;
    readonly sequence?: ISequence;
}

/**
 * @public
 */
export interface IHasTextureRegion {
    /** The name used to find the {@link #region()}. */
    path: string;

    /** The region used to draw the attachment. After setting the region or if the region's properties are changed,
     * {@link #updateRegion()} must be called. */
    region: TextureRegion | null;

    /** Updates any values the attachment calculates using the {@link #getRegion()}. Must be called after setting the
     * {@link #getRegion()} or if the region's properties are changed. */
    // updateRegion (): void;

    /** The color to tint the attachment. */
    color: Color;

    readonly sequence: ISequence | null;
}

/**
 * @public
 */
export interface ISequence {
    id: number;
    regions: TextureRegion[];
    apply(slot: ISlot, attachment: IHasTextureRegion): void;
}

/**
 * @public
 */
export interface IVertexAttachment<Slot extends ISlot = ISlot> extends IAttachment {
    id: number;
    computeWorldVerticesOld(slot: Slot, worldVertices: ArrayLike<number>): void;
    computeWorldVertices(slot: Slot, start: number, count: number, worldVertices: ArrayLike<number>, offset: number, stride: number): void;
    worldVerticesLength: number;
}

/**
 * @public
 */
export interface IClippingAttachment extends IVertexAttachment {
    endSlot?: ISlotData;
}

/**
 * @public
 */
export interface IRegionAttachment extends IAttachment {
    region: TextureRegion;
    color: Color;
    x;
    y;
    scaleX;
    scaleY;
    rotation;
    width;
    height: number;
}

/**
 * @public
 */
export interface IMeshAttachment extends IVertexAttachment {
    region: TextureRegion;
    color: Color;
    regionUVs: Float32Array;
    triangles: number[];
    hullLength: number;
}

/**
 * @public
 */
export interface ISlotData {
    index: number;
    name: string;
    boneData: IBoneData;
    color: Color;
    darkColor: Color;
    attachmentName: string;
    blendMode: BLEND_MODES;
}

/**
 * @public
 */
export interface IBoneData {
    index: number;
    name: string;
    parent: IBoneData;
    length: number;
    x: number;
    y: number;
    rotation: number;
    scaleX: number;
    scaleY: number;
    shearX: number;
    shearY: number;
    transformMode: TransformMode;
}

/**
 * @public
 */
export interface ISlot {
    getAttachment(): IAttachment;
    data: ISlotData;
    color: Color;
    darkColor: Color;
    blendMode: number;
    bone: IBone;

    sprites?: any;
    currentSprite?: any;
    currentSpriteName?: string;

    meshes?: any;
    currentMesh?: any;
    currentMeshName?: string;
    currentMeshId?: number;

    currentGraphics?: any;
    clippingContainer?: any;

    hackRegion?: TextureRegion;
    hackAttachment?: IAttachment;
}

/**
 * @public
 */
export interface ISkeleton<SkeletonData extends ISkeletonData = ISkeletonData, Bone extends IBone = IBone, Slot extends ISlot = ISlot, Skin extends ISkin = ISkin> {
    bones: Bone[];
    slots: Slot[];
    drawOrder: Slot[];
    skin: Skin;
    data: SkeletonData;
    x: number; // added for debug purposes
    y: number; // added for debug purposes
    updateWorldTransform(): void;
    setToSetupPose(): void;
    findSlotIndex(slotName: string): number;
    getAttachmentByName(slotName: string, attachmentName: string): IAttachment;

    setBonesToSetupPose(): void;
    setSlotsToSetupPose(): void;
    findBone(boneName: string): Bone;
    findSlot(slotName: string): Slot;
    findBoneIndex(boneName: string): number;
    findSlotIndex(slotName: string): number;
    setSkin(newSkin: Skin | null): void;
    setSkinByName(skinName: string): void;
    setAttachment(slotName: string, attachmentName: string): void;
    getBounds(offset: Vector2, size: Vector2, temp: Array<number>): void;
}

/**
 * @public
 */
export interface ISkeletonParser {
    scale: number;
}

/**
 * @public
 */
export interface ISkeletonData<
    BoneData extends IBoneData = IBoneData,
    SlotData extends ISlotData = ISlotData,
    Skin extends ISkin = ISkin,
    Animation extends IAnimation = IAnimation,
    EventData extends IEventData = IEventData,
    IkConstraintData extends IIkConstraintData = IIkConstraintData,
    TransformConstraintData extends ITransformConstraintData = ITransformConstraintData,
    PathConstraintData extends IPathConstraintData = IPathConstraintData
> {
    name: string;
    bones: BoneData[];
    slots: SlotData[];
    skins: Skin[];
    defaultSkin: Skin;
    events: EventData[];
    animations: Animation[];
    version: string;
    hash: string;
    width: number;
    height: number;
    ikConstraints: IkConstraintData[];
    transformConstraints: TransformConstraintData[];
    pathConstraints: PathConstraintData[];

    findBone(boneName: string): BoneData | null;
    findBoneIndex(boneName: string): number;
    findSlot(slotName: string): SlotData | null;
    findSlotIndex(slotName: string): number;
    findSkin(skinName: string): Skin | null;

    findEvent(eventDataName: string): EventData | null;
    findAnimation(animationName: string): Animation | null;
    findIkConstraint(constraintName: string): IkConstraintData | null;
    findTransformConstraint(constraintName: string): TransformConstraintData | null;
    findPathConstraint(constraintName: string): PathConstraintData | null;
}
