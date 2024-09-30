import type { ISkeleton, ISkeletonData } from './ISkeleton';
import type { StringMap } from './Utils';

// Those enums were moved from Animation.ts of spine 3.8 and 4.0

/** Controls how a timeline value is mixed with the setup pose value or current pose value when a timeline's `alpha`
 * < 1.
 *
 * See Timeline {@link Timeline#apply(Skeleton, float, float, Array, float, MixBlend, MixDirection)}.
 * @public
 * */
export enum MixBlend {
    /** Transitions from the setup value to the timeline value (the current value is not used). Before the first key, the setup
     * value is set. */
    setup,
    /** Transitions from the current value to the timeline value. Before the first key, transitions from the current value to
     * the setup value. Timelines which perform instant transitions, such as DrawOrderTimeline or
     * AttachmentTimeline, use the setup value before the first key.
     *
     * `first` is intended for the first animations applied, not for animations layered on top of those. */
    first,
    /** Transitions from the current value to the timeline value. No change is made before the first key (the current value is
     * kept until the first key).
     *
     * `replace` is intended for animations layered on top of others, not for the first animations applied. */
    replace,
    /** Transitions from the current value to the current value plus the timeline value. No change is made before the first key
     * (the current value is kept until the first key).
     *
     * `add` is intended for animations layered on top of others, not for the first animations applied. Properties
     * keyed by additive animations must be set manually or by another animation before applying the additive animations, else
     * the property values will increase continually. */
    add,
}

/** Indicates whether a timeline's `alpha` is mixing out over time toward 0 (the setup or current pose value) or
 * mixing in toward 1 (the timeline's value).
 *
 * See Timeline {@link Timeline#apply(Skeleton, float, float, Array, float, MixBlend, MixDirection)}.
 * @public
 * */
export enum MixDirection {
    mixIn,
    mixOut,
}

/**
 * @public
 */
export interface IAnimation<Timeline extends ITimeline = ITimeline> {
    name: string;
    timelines: Timeline[];
    duration: number;
}

/**
 * @public
 */
export interface IAnimationState<AnimationStateData extends IAnimationStateData = IAnimationStateData> {
    data: AnimationStateData;
    tracks: ITrackEntry[];
    listeners: IAnimationStateListener[];
    timeScale: number;

    update(dt: number): void;
    apply(skeleton: ISkeleton): boolean;

    setAnimation(trackIndex: number, animationName: string, loop: boolean): ITrackEntry;
    addAnimation(trackIndex: number, animationName: string, loop: boolean, delay: number): ITrackEntry;
    addEmptyAnimation(trackIndex: number, mixDuration: number, delay: number): ITrackEntry;
    setEmptyAnimation(trackIndex: number, mixDuration: number): ITrackEntry;
    setEmptyAnimations(mixDuration: number): void;
    hasAnimation(animationName: string): boolean;
    addListener(listener: IAnimationStateListener): void;
    removeListener(listener: IAnimationStateListener): void;
    clearListeners(): void;
    clearTracks(): void;
    clearTrack(index: number): void;
}

/**
 * @public
 */
export interface IAnimationStateData<SkeletonData extends ISkeletonData = ISkeletonData, Animation extends IAnimation = IAnimation> {
    skeletonData: SkeletonData;
    animationToMixTime: StringMap<number>;
    defaultMix: number;
    setMix(fromName: string, toName: string, duration: number): void;
    setMixWith(from: Animation, to: Animation, duration: number): void;
    getMix(from: Animation, to: Animation): number;
}

/**
 * @public
 */
export interface IAnimationStateListener {
    start?(entry: ITrackEntry): void;
    interrupt?(entry: ITrackEntry): void;
    end?(entry: ITrackEntry): void;
    dispose?(entry: ITrackEntry): void;
    complete?(entry: ITrackEntry): void;
    event?(entry: ITrackEntry, event: IEvent): void;
}

/**
 * @public
 */
export interface ITimeline {}

/**
 * @public
 */
export interface ITrackEntry {
    trackIndex: number;
    loop: boolean;
    animationEnd: number;
    listener: IAnimationStateListener;

    delay: number;
    trackTime: number;
    trackLast: number;
    nextTrackLast: number;
    trackEnd: number;
    timeScale: number;
    alpha: number;
    mixTime: number;
    mixDuration: number;
    interruptAlpha: number;
    totalAlpha: number;
}

/**
 * @public
 */
export interface IEventData {
    name: string;
}

/**
 * @public
 */
export interface IEvent {
    time: number;
    data: IEventData;
}
