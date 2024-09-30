import { Physics } from '@pixi-spine/base';

/** The interface for items updated by {@link Skeleton#updateWorldTransform()}.
 * @public
 * */
export interface Updatable {
    /** @param physics Determines how physics and other non-deterministic updates are applied. */
    update(physics: Physics): void;

    /** Returns false when this item won't be updated by
     * {@link Skeleton#updateWorldTransform()} because a skin is required and the
     * {@link Skeleton#getSkin() active skin} does not contain this item.
     * @see Skin#getBones()
     * @see Skin#getConstraints()
     * @see BoneData#getSkinRequired()
     * @see ConstraintData#getSkinRequired() */
    isActive(): boolean;
}
