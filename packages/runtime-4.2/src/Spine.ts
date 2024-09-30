import { AnimationState } from './core/AnimationState';
import { AnimationStateData } from './core/AnimationStateData';
import { Skeleton } from './core/Skeleton';
import { Physics, SpineBase } from '@pixi-spine/base';

import type { SkeletonData } from './core/SkeletonData';

/**
 * @public
 */
export class Spine extends SpineBase<Skeleton, SkeletonData, AnimationState, AnimationStateData> {
    createSkeleton(spineData: SkeletonData) {
        this.skeleton = new Skeleton(spineData);
        this.skeleton.updateWorldTransform(Physics.update);
        this.stateData = new AnimationStateData(spineData);
        this.state = new AnimationState(this.stateData);
    }
}
