import { Bone } from './Bone.js';
import { PhysicsConstraintData } from './PhysicsConstraintData.js';
import { Skeleton } from './Skeleton.js';
import { Updatable } from './Updatable.js';
import { MathUtils, Physics } from '@pixi-spine/base';

/** Stores the current pose for a physics constraint. A physics constraint applies physics to bones.
 *
 * See <a href="http://esotericsoftware.com/spine-physics-constraints">Physics constraints</a> in the Spine User Guide.
 * @public
 * */
export class PhysicsConstraint implements Updatable {
    readonly data: PhysicsConstraintData;
    private _bone: Bone | null = null;

    public set bone(bone: Bone) {
        this._bone = bone;
    }
    public get bone() {
        if (!this._bone) throw new Error('Bone not set.');
        else return this._bone;
    }
    inertia = 0;
    strength = 0;
    damping = 0;
    massInverse = 0;
    wind = 0;
    gravity = 0;
    mix = 0;

    _reset = true;
    ux = 0;
    uy = 0;
    cx = 0;
    cy = 0;
    tx = 0;
    ty = 0;
    xOffset = 0;
    xVelocity = 0;
    yOffset = 0;
    yVelocity = 0;
    rotateOffset = 0;
    rotateVelocity = 0;
    scaleOffset = 0;
    scaleVelocity = 0;

    active = false;

    readonly skeleton: Skeleton;
    remaining = 0;
    lastTime = 0;

    constructor(data: PhysicsConstraintData, skeleton: Skeleton) {
        this.data = data;
        this.skeleton = skeleton;

        this.bone = skeleton.bones[data.bone.index];

        this.inertia = data.inertia;
        this.strength = data.strength;
        this.damping = data.damping;
        this.massInverse = data.massInverse;
        this.wind = data.wind;
        this.gravity = data.gravity;
        this.mix = data.mix;
    }

    reset() {
        this.remaining = 0;
        this.lastTime = this.skeleton.time;
        this._reset = true;
        this.xOffset = 0;
        this.xVelocity = 0;
        this.yOffset = 0;
        this.yVelocity = 0;
        this.rotateOffset = 0;
        this.rotateVelocity = 0;
        this.scaleOffset = 0;
        this.scaleVelocity = 0;
    }

    setToSetupPose() {
        const data = this.data;

        this.inertia = data.inertia;
        this.strength = data.strength;
        this.damping = data.damping;
        this.massInverse = data.massInverse;
        this.wind = data.wind;
        this.gravity = data.gravity;
        this.mix = data.mix;
    }

    isActive() {
        return this.active;
    }

    /** Applies the constraint to the constrained bones. */
    update(physics: Physics) {
        const mix = this.mix;

        if (mix == 0) return;

        const x = this.data.x > 0;
        const y = this.data.y > 0;
        const rotateOrShearX = this.data.rotate > 0 || this.data.shearX > 0;
        const scaleX = this.data.scaleX > 0;
        const bone = this.bone;
        const l = bone.data.length;

        switch (physics) {
            case Physics.none:
                return;
            case Physics.reset:
                this.reset();
            // Fall through.
            case Physics.update:
                const skeleton = this.skeleton;
                const delta = Math.max(this.skeleton.time - this.lastTime, 0);

                this.remaining += delta;
                this.lastTime = skeleton.time;

                const bx = bone.worldX;
                const by = bone.worldY;

                if (this._reset) {
                    this._reset = false;
                    this.ux = bx;
                    this.uy = by;
                } else {
                    let a = this.remaining;
                    const i = this.inertia;
                    const t = this.data.step;
                    const f = this.skeleton.data.referenceScale;
                    let d = -1;
                    let qx = this.data.limit * delta;
                    const qy = qx * Math.abs(skeleton.scaleY);

                    qx *= Math.abs(skeleton.scaleX);
                    if (x || y) {
                        if (x) {
                            const u = (this.ux - bx) * i;

                            this.xOffset += u > qx ? qx : u < -qx ? -qx : u;
                            this.ux = bx;
                        }
                        if (y) {
                            const u = (this.uy - by) * i;

                            this.yOffset += u > qy ? qy : u < -qy ? -qy : u;
                            this.uy = by;
                        }
                        if (a >= t) {
                            d = Math.pow(this.damping, 60 * t);
                            const m = this.massInverse * t;
                            const e = this.strength;
                            const w = this.wind * f;
                            const g = (Skeleton.yDown ? -this.gravity : this.gravity) * f;

                            do {
                                if (x) {
                                    this.xVelocity += (w - this.xOffset * e) * m;
                                    this.xOffset += this.xVelocity * t;
                                    this.xVelocity *= d;
                                }
                                if (y) {
                                    this.yVelocity -= (g + this.yOffset * e) * m;
                                    this.yOffset += this.yVelocity * t;
                                    this.yVelocity *= d;
                                }
                                a -= t;
                            } while (a >= t);
                        }
                        if (x) bone.worldX += this.xOffset * mix * this.data.x;
                        if (y) bone.worldY += this.yOffset * mix * this.data.y;
                    }
                    if (rotateOrShearX || scaleX) {
                        const ca = Math.atan2(bone.c, bone.a);
                        let c = 0;
                        let s = 0;
                        let mr = 0;
                        let dx = this.cx - bone.worldX;
                        let dy = this.cy - bone.worldY;

                        if (dx > qx) dx = qx;
                        else if (dx < -qx)
                            //
                            dx = -qx;
                        if (dy > qy) dy = qy;
                        else if (dy < -qy)
                            //
                            dy = -qy;
                        if (rotateOrShearX) {
                            mr = (this.data.rotate + this.data.shearX) * mix;
                            let r = Math.atan2(dy + this.ty, dx + this.tx) - ca - this.rotateOffset * mr;

                            this.rotateOffset += (r - Math.ceil(r * MathUtils.invPI2 - 0.5) * MathUtils.PI2) * i;
                            r = this.rotateOffset * mr + ca;
                            c = Math.cos(r);
                            s = Math.sin(r);
                            if (scaleX) {
                                r = l * bone.getWorldScaleX();
                                if (r > 0) this.scaleOffset += ((dx * c + dy * s) * i) / r;
                            }
                        } else {
                            c = Math.cos(ca);
                            s = Math.sin(ca);
                            const r = l * bone.getWorldScaleX();

                            if (r > 0) this.scaleOffset += ((dx * c + dy * s) * i) / r;
                        }
                        a = this.remaining;
                        if (a >= t) {
                            if (d == -1) d = Math.pow(this.damping, 60 * t);
                            const m = this.massInverse * t;
                            const e = this.strength;
                            const w = this.wind;
                            const g = Skeleton.yDown ? -this.gravity : this.gravity;
                            const h = l / f;

                            while (true) {
                                a -= t;
                                if (scaleX) {
                                    this.scaleVelocity += (w * c - g * s - this.scaleOffset * e) * m;
                                    this.scaleOffset += this.scaleVelocity * t;
                                    this.scaleVelocity *= d;
                                }
                                if (rotateOrShearX) {
                                    this.rotateVelocity -= ((w * s + g * c) * h + this.rotateOffset * e) * m;
                                    this.rotateOffset += this.rotateVelocity * t;
                                    this.rotateVelocity *= d;
                                    if (a < t) break;
                                    const r = this.rotateOffset * mr + ca;

                                    c = Math.cos(r);
                                    s = Math.sin(r);
                                } else if (a < t)
                                    //
                                    break;
                            }
                        }
                    }
                    this.remaining = a;
                }
                this.cx = bone.worldX;
                this.cy = bone.worldY;
                break;
            case Physics.pose:
                if (x) bone.worldX += this.xOffset * mix * this.data.x;
                if (y) bone.worldY += this.yOffset * mix * this.data.y;
        }

        if (rotateOrShearX) {
            let o = this.rotateOffset * mix;
            let s = 0;
            let c = 0;
            let a = 0;

            if (this.data.shearX > 0) {
                let r = 0;

                if (this.data.rotate > 0) {
                    r = o * this.data.rotate;
                    s = Math.sin(r);
                    c = Math.cos(r);
                    a = bone.b;
                    bone.b = c * a - s * bone.d;
                    bone.d = s * a + c * bone.d;
                }
                r += o * this.data.shearX;
                s = Math.sin(r);
                c = Math.cos(r);
                a = bone.a;
                bone.a = c * a - s * bone.c;
                bone.c = s * a + c * bone.c;
            } else {
                o *= this.data.rotate;
                s = Math.sin(o);
                c = Math.cos(o);
                a = bone.a;
                bone.a = c * a - s * bone.c;
                bone.c = s * a + c * bone.c;
                a = bone.b;
                bone.b = c * a - s * bone.d;
                bone.d = s * a + c * bone.d;
            }
        }
        if (scaleX) {
            const s = 1 + this.scaleOffset * mix * this.data.scaleX;

            bone.a *= s;
            bone.c *= s;
        }
        if (physics != Physics.pose) {
            this.tx = l * bone.a;
            this.ty = l * bone.c;
        }
        bone.updateAppliedTransform();
    }

    /** Translates the physics constraint so next {@link #update(Physics)} forces are applied as if the bone moved an additional
     * amount in world space. */
    translate(x: number, y: number) {
        this.ux -= x;
        this.uy -= y;
        this.cx -= x;
        this.cy -= y;
    }

    /** Rotates the physics constraint so next {@link #update(Physics)} forces are applied as if the bone rotated around the
     * specified point in world space. */
    rotate(x: number, y: number, degrees: number) {
        const r = degrees * MathUtils.degRad;
        const cos = Math.cos(r);
        const sin = Math.sin(r);
        const dx = this.cx - x;
        const dy = this.cy - y;

        this.translate(dx * cos - dy * sin - dx, dx * sin + dy * cos - dy);
    }
}
