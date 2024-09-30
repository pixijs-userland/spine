import { BoneData } from './BoneData.js';
import { ConstraintData } from './ConstraintData.js';

/** Stores the setup pose for a {@link PhysicsConstraint}.
 * <p>
 * See <a href="http://esotericsoftware.com/spine-physics-constraints">Physics constraints</a> in the Spine User Guide.
 * @public
 * */
export class PhysicsConstraintData extends ConstraintData {
    private _bone: BoneData | null = null;

    public set bone(boneData: BoneData) {
        this._bone = boneData;
    }
    public get bone() {
        if (!this._bone) throw new Error('BoneData not set.');
        else return this._bone;
    }

    x = 0;
    y = 0;
    rotate = 0;
    scaleX = 0;
    shearX = 0;
    limit = 0;
    step = 0;
    inertia = 0;
    strength = 0;
    damping = 0;
    massInverse = 0;
    wind = 0;
    gravity = 0;
    /** A percentage (0-1) that controls the mix between the constrained and unconstrained poses. */
    mix = 0;
    inertiaGlobal = false;
    strengthGlobal = false;
    dampingGlobal = false;
    massGlobal = false;
    windGlobal = false;
    gravityGlobal = false;
    mixGlobal = false;

    constructor(name: string) {
        super(name, 0, false);
    }
}
