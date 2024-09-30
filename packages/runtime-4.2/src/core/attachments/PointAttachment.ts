import { Bone } from '../Bone.js';
import { Attachment, VertexAttachment } from './Attachment.js';
import { Color, MathUtils, Vector2 } from '@pixi-spine/base';

/** An attachment which is a single point and a rotation. This can be used to spawn projectiles, particles, etc. A bone can be
 * used in similar ways, but a PointAttachment is slightly less expensive to compute and can be hidden, shown, and placed in a
 * skin.
 * @public
 * See [Point Attachments](http://esotericsoftware.com/spine-point-attachments) in the Spine User Guide. */
export class PointAttachment extends VertexAttachment {
    x = 0;
    y = 0;
    rotation = 0;

    /** The color of the point attachment as it was in Spine. Available only when nonessential data was exported. Point attachments
     * are not usually rendered at runtime. */
    color = new Color(0.38, 0.94, 0, 1);

    constructor(name: string) {
        super(name);
    }

    computeWorldPosition(bone: Bone, point: Vector2) {
        point.x = this.x * bone.a + this.y * bone.b + bone.worldX;
        point.y = this.x * bone.c + this.y * bone.d + bone.worldY;

        return point;
    }

    computeWorldRotation(bone: Bone) {
        const r = this.rotation * MathUtils.degRad;
        const cos = Math.cos(r);
        const sin = Math.sin(r);
        const x = cos * bone.a + sin * bone.b;
        const y = cos * bone.c + sin * bone.d;

        return MathUtils.atan2Deg(y, x);
    }

    copy(): Attachment {
        const copy = new PointAttachment(this.name);

        copy.x = this.x;
        copy.y = this.y;
        copy.rotation = this.rotation;
        copy.color.setFromColor(this.color);

        return copy;
    }
}
