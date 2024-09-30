import { AttachmentLoader, BoundingBoxAttachment, ClippingAttachment, MeshAttachment, PathAttachment, PointAttachment, RegionAttachment, Sequence } from './attachments';
import { Skin } from './Skin.js';

import type { TextureAtlas } from '@pixi-spine/base';

/** An {@link AttachmentLoader} that configures attachments using texture regions from an TextureAtlas.
 *
 * See [Loading skeleton data](http://esotericsoftware.com/spine-loading-skeleton-data#JSON-and-binary-data) in the
 * Spine Runtimes Guide.
 * @public
 * */
export class AtlasAttachmentLoader implements AttachmentLoader {
    atlas: TextureAtlas;

    constructor(atlas: TextureAtlas) {
        this.atlas = atlas;
    }

    loadSequence(name: string, basePath: string, sequence: Sequence) {
        const regions = sequence.regions;

        for (let i = 0, n = regions.length; i < n; i++) {
            const path = sequence.getPath(basePath, i);
            const region = this.atlas.findRegion(path);

            if (region == null) throw new Error(`Region not found in atlas: ${path} (sequence: ${name})`);
            regions[i] = region;
        }
    }

    newRegionAttachment(skin: Skin, name: string, path: string, sequence: Sequence): RegionAttachment {
        const attachment = new RegionAttachment(name, path);

        if (sequence != null) {
            this.loadSequence(name, path, sequence);
        } else {
            const region = this.atlas.findRegion(path);

            if (!region) throw new Error(`Region not found in atlas: ${path} (region attachment: ${name})`);
            attachment.region = region;
        }

        return attachment;
    }

    newMeshAttachment(skin: Skin, name: string, path: string, sequence: Sequence): MeshAttachment {
        const attachment = new MeshAttachment(name, path);

        if (sequence != null) {
            this.loadSequence(name, path, sequence);
        } else {
            const region = this.atlas.findRegion(path);

            if (!region) throw new Error(`Region not found in atlas: ${path} (mesh attachment: ${name})`);
            attachment.region = region;
        }

        return attachment;
    }

    newBoundingBoxAttachment(skin: Skin, name: string): BoundingBoxAttachment {
        return new BoundingBoxAttachment(name);
    }

    newPathAttachment(skin: Skin, name: string): PathAttachment {
        return new PathAttachment(name);
    }

    newPointAttachment(skin: Skin, name: string): PointAttachment {
        return new PointAttachment(name);
    }

    newClippingAttachment(skin: Skin, name: string): ClippingAttachment {
        return new ClippingAttachment(name);
    }
}
