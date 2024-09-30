import { detectSpineVersion, IAnimationState, IAnimationStateData, ISkeleton, ISkeletonData, Physics, SPINE_VERSION, SpineBase } from '@pixi-spine/base';
import * as spine37 from '@pixi-spine/runtime-3.7';
import * as spine38 from '@pixi-spine/runtime-3.8';
import * as spine41 from '@pixi-spine/runtime-4.1';
import * as spine42 from '@pixi-spine/runtime-4.2';

/**
 * @public
 */
export class Spine extends SpineBase<ISkeleton, ISkeletonData, IAnimationState, IAnimationStateData> {
    createSkeleton(spineData: ISkeletonData) {
        const ver = detectSpineVersion(spineData.version);
        let spine: any = null;

        if (ver === SPINE_VERSION.VER37) {
            spine = spine37;
        }
        if (ver === SPINE_VERSION.VER38) {
            spine = spine38;
        }
        if (ver === SPINE_VERSION.VER40 || ver === SPINE_VERSION.VER41) {
            spine = spine41;
        }

        if (ver === SPINE_VERSION.VER42) {
            spine = spine42;
        }

        if (!spine) {
            const error = `Cant detect version of spine model ${spineData.version}`;

            console.error(error);
        }
        console.log('version ', ver, spineData, spine);
        this.skeleton = new spine.Skeleton(spineData);
        this.skeleton.updateWorldTransform(ver === SPINE_VERSION.VER42 && Physics.update);
        this.stateData = new spine.AnimationStateData(spineData);
        this.state = new spine.AnimationState(this.stateData);
        this.skeleton.setToSetupPose();
    }
}
