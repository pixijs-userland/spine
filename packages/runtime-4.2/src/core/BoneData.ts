import { Color, TransformMode } from '@pixi-spine/base';

/** Stores the setup pose for a {@link Bone}.
 * @public
 * */
export class BoneData {
    /** The index of the bone in {@link Skeleton#getBones()}. */
    index = 0;

    /** The name of the bone, which is unique across all bones in the skeleton. */
    name: string;

    /** @returns May be null. */
    parent: BoneData | null = null;

    /** The bone's length. */
    length = 0;

    /** The local x translation. */
    x = 0;

    /** The local y translation. */
    y = 0;

    /** The local rotation in degrees, counter clockwise. */
    rotation = 0;

    /** The local scaleX. */
    scaleX = 1;

    /** The local scaleY. */
    scaleY = 1;

    /** The local shearX. */
    shearX = 0;

    /** The local shearX. */
    shearY = 0;

    /** The transform mode for how parent world transforms affect this bone. */
    transformMode = TransformMode.Normal;

    /** When true, {@link Skeleton#updateWorldTransform()} only updates this bone if the {@link Skeleton#skin} contains this
     * bone.
     * @see Skin#bones */
    skinRequired = false;

    /** The color of the bone as it was in Spine. Available only when nonessential data was exported. Bones are not usually
     * rendered at runtime. */
    color = new Color();

    /** The bone icon as it was in Spine, or null if nonessential data was not exported. */
    icon?: string;

    /** False if the bone was hidden in Spine and nonessential data was exported. Does not affect runtime rendering. */
    visible = false;

    constructor(index: number, name: string, parent: BoneData | null) {
        if (index < 0) throw new Error('index must be >= 0.');
        if (!name) throw new Error('name cannot be null.');
        this.index = index;
        this.name = name;
        this.parent = parent;
    }
}
