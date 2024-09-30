import { Attachment, MeshAttachment } from './attachments';
import type { BoneData } from './BoneData';
import type { ConstraintData } from './Constraint';
import type { Skeleton } from './Skeleton';

import type { StringMap, ISkin } from '@pixi-spine/base';

/**
 * @public
 */
export class SkinEntry {
    constructor(public slotIndex: number, public name: string, public attachment: Attachment) {}
}

/**
 * @public
 */
export class Skin implements ISkin {
    name: string;
    attachments = new Array<StringMap<Attachment>>();
    bones = Array<BoneData>();
    constraints = new Array<ConstraintData>();

    constructor(name: string) {
        if (name == null) throw new Error('name cannot be null.');
        this.name = name;
    }

    setAttachment(slotIndex: number, name: string, attachment: Attachment) {
        if (attachment == null) throw new Error('attachment cannot be null.');
        const attachments = this.attachments;

        if (slotIndex >= attachments.length) attachments.length = slotIndex + 1;
        if (!attachments[slotIndex]) attachments[slotIndex] = {};
        attachments[slotIndex][name] = attachment;
    }

    addSkin(skin: Skin) {
        for (let i = 0; i < skin.bones.length; i++) {
            const bone = skin.bones[i];
            let contained = false;

            for (let j = 0; j < this.bones.length; j++) {
                if (this.bones[j] == bone) {
                    contained = true;
                    break;
                }
            }
            if (!contained) this.bones.push(bone);
        }

        for (let i = 0; i < skin.constraints.length; i++) {
            const constraint = skin.constraints[i];
            let contained = false;

            for (let j = 0; j < this.constraints.length; j++) {
                if (this.constraints[j] == constraint) {
                    contained = true;
                    break;
                }
            }
            if (!contained) this.constraints.push(constraint);
        }

        const attachments = skin.getAttachments();

        for (let i = 0; i < attachments.length; i++) {
            const attachment = attachments[i];

            this.setAttachment(attachment.slotIndex, attachment.name, attachment.attachment);
        }
    }

    copySkin(skin: Skin) {
        for (let i = 0; i < skin.bones.length; i++) {
            const bone = skin.bones[i];
            let contained = false;

            for (let j = 0; j < this.bones.length; j++) {
                if (this.bones[j] == bone) {
                    contained = true;
                    break;
                }
            }
            if (!contained) this.bones.push(bone);
        }

        for (let i = 0; i < skin.constraints.length; i++) {
            const constraint = skin.constraints[i];
            let contained = false;

            for (let j = 0; j < this.constraints.length; j++) {
                if (this.constraints[j] == constraint) {
                    contained = true;
                    break;
                }
            }
            if (!contained) this.constraints.push(constraint);
        }

        const attachments = skin.getAttachments();

        for (let i = 0; i < attachments.length; i++) {
            const attachment = attachments[i];

            if (attachment.attachment == null) continue;
            if (attachment.attachment instanceof MeshAttachment) {
                attachment.attachment = attachment.attachment.newLinkedMesh();
                this.setAttachment(attachment.slotIndex, attachment.name, attachment.attachment);
            } else {
                attachment.attachment = attachment.attachment.copy();
                this.setAttachment(attachment.slotIndex, attachment.name, attachment.attachment);
            }
        }
    }

    /** @return May be null. */
    getAttachment(slotIndex: number, name: string): Attachment {
        const dictionary = this.attachments[slotIndex];

        return dictionary ? dictionary[name] : null;
    }

    removeAttachment(slotIndex: number, name: string) {
        const dictionary = this.attachments[slotIndex];

        if (dictionary) dictionary[name] = null;
    }

    getAttachments(): Array<SkinEntry> {
        const entries = new Array<SkinEntry>();

        for (let i = 0; i < this.attachments.length; i++) {
            const slotAttachments = this.attachments[i];

            if (slotAttachments) {
                for (const name in slotAttachments) {
                    const attachment = slotAttachments[name];

                    if (attachment) entries.push(new SkinEntry(i, name, attachment));
                }
            }
        }

        return entries;
    }

    getAttachmentsForSlot(slotIndex: number, attachments: Array<SkinEntry>) {
        const slotAttachments = this.attachments[slotIndex];

        if (slotAttachments) {
            for (const name in slotAttachments) {
                const attachment = slotAttachments[name];

                if (attachment) attachments.push(new SkinEntry(slotIndex, name, attachment));
            }
        }
    }

    clear() {
        this.attachments.length = 0;
        this.bones.length = 0;
        this.constraints.length = 0;
    }

    /** Attach each attachment in this skin if the corresponding attachment in the old skin is currently attached. */
    attachAll(skeleton: Skeleton, oldSkin: Skin) {
        let slotIndex = 0;

        for (let i = 0; i < skeleton.slots.length; i++) {
            const slot = skeleton.slots[i];
            const slotAttachment = slot.getAttachment();

            if (slotAttachment && slotIndex < oldSkin.attachments.length) {
                const dictionary = oldSkin.attachments[slotIndex];

                for (const key in dictionary) {
                    const skinAttachment: Attachment = dictionary[key];

                    if (slotAttachment == skinAttachment) {
                        const attachment = this.getAttachment(slotIndex, key);

                        if (attachment != null) slot.setAttachment(attachment);
                        break;
                    }
                }
            }
            slotIndex++;
        }
    }
}
