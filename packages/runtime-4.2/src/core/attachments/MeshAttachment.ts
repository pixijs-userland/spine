import { Slot } from '../Slot.js';
import { Attachment, VertexAttachment } from './Attachment.js';
import { Sequence } from './Sequence.js';
import { Color, IHasTextureRegion, IMeshAttachment, NumberArrayLike, TextureRegion, Utils } from '@pixi-spine/base';

/** An attachment that displays a textured mesh. A mesh has hull vertices and internal vertices within the hull. Holes are not
 * supported. Each vertex has UVs (texture coordinates) and triangles are used to map an image on to the mesh.
 * @public
 * See [Mesh attachments](http://esotericsoftware.com/spine-meshes) in the Spine User Guide. */
export class MeshAttachment extends VertexAttachment implements IMeshAttachment, IHasTextureRegion {
    region: TextureRegion | null = null;

    /** The name of the texture region for this attachment. */
    path: string;

    /** The UV pair for each vertex, normalized within the texture region. */
    regionUVs: Float32Array;

    /** The UV pair for each vertex, normalized within the entire texture.
     *
     * See {@link #updateUVs}. */
    uvs: NumberArrayLike = [];

    /** Triplets of vertex indices which describe the mesh's triangulation. */
    triangles: Array<number> = [];

    /** The color to tint the mesh. */
    color = new Color(1, 1, 1, 1);

    /** The width of the mesh's image. Available only when nonessential data was exported. */
    width = 0;

    /** The height of the mesh's image. Available only when nonessential data was exported. */
    height = 0;

    /** The number of entries at the beginning of {@link #vertices} that make up the mesh hull. */
    hullLength = 0;

    /** Vertex index pairs describing edges for controling triangulation. Mesh triangles will never cross edges. Only available if
     * nonessential data was exported. Triangulation is not performed at runtime. */
    edges: Array<number> = [];

    private parentMesh: MeshAttachment | null = null;

    sequence: Sequence | null = null;

    tempColor = new Color(0, 0, 0, 0);

    constructor(name: string, path: string) {
        super(name);
        this.path = path;
    }

    /** The parent mesh if this is a linked mesh, else null. A linked mesh shares the {@link #bones}, {@link #vertices},
     * {@link #regionUVs}, {@link #triangles}, {@link #hullLength}, {@link #edges}, {@link #width}, and {@link #height} with the
     * parent mesh, but may have a different {@link #name} or {@link #path} (and therefore a different texture). */
    getParentMesh() {
        return this.parentMesh;
    }

    /** @param parentMesh May be null. */
    setParentMesh(parentMesh: MeshAttachment) {
        this.parentMesh = parentMesh;
        if (parentMesh) {
            this.bones = parentMesh.bones;
            this.vertices = parentMesh.vertices;
            this.worldVerticesLength = parentMesh.worldVerticesLength;
            this.regionUVs = parentMesh.regionUVs;
            this.triangles = parentMesh.triangles;
            this.hullLength = parentMesh.hullLength;
            this.worldVerticesLength = parentMesh.worldVerticesLength;
        }
    }

    copy(): Attachment {
        if (this.parentMesh) return this.newLinkedMesh();

        const copy = new MeshAttachment(this.name, this.path);

        copy.region = this.region;
        copy.color.setFromColor(this.color);

        this.copyTo(copy);
        copy.regionUVs = new Float32Array(this.regionUVs.length);
        Utils.arrayCopy(this.regionUVs, 0, copy.regionUVs, 0, this.regionUVs.length);
        copy.uvs = new Array<number>(this.uvs.length);
        Utils.arrayCopy(this.uvs, 0, copy.uvs, 0, this.uvs.length);
        copy.triangles = new Array<number>(this.triangles.length);
        Utils.arrayCopy(this.triangles, 0, copy.triangles, 0, this.triangles.length);
        copy.hullLength = this.hullLength;

        copy.sequence = this.sequence != null ? this.sequence.copy() : null;

        // Nonessential.
        if (this.edges) {
            copy.edges = new Array<number>(this.edges.length);
            Utils.arrayCopy(this.edges, 0, copy.edges, 0, this.edges.length);
        }
        copy.width = this.width;
        copy.height = this.height;

        return copy;
    }

    computeWorldVertices(slot: Slot, start: number, count: number, worldVertices: NumberArrayLike, offset: number, stride: number) {
        if (this.sequence != null) this.sequence.apply(slot, this);
        super.computeWorldVertices(slot, start, count, worldVertices, offset, stride);
    }

    /** Returns a new mesh with the {@link #parentMesh} set to this mesh's parent mesh, if any, else to this mesh. **/
    newLinkedMesh(): MeshAttachment {
        const copy = new MeshAttachment(this.name, this.path);

        copy.region = this.region;
        copy.color.setFromColor(this.color);
        copy.timelineAttachment = this.timelineAttachment;
        copy.setParentMesh(this.parentMesh ? this.parentMesh : this);

        return copy;
    }
}
