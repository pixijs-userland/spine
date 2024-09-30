import { ClippingAttachment } from './attachments';
import { Slot } from './Slot.js';
import { Triangulator } from './Triangulator.js';
import { Color, NumberArrayLike, Utils } from '@pixi-spine/base';

/**
 * @public
 */
export class SkeletonClipping {
    private triangulator = new Triangulator();
    private clippingPolygon = new Array<number>();
    private clipOutput = new Array<number>();
    clippedVertices = new Array<number>();
    clippedUVs = new Array<number>();
    clippedTriangles = new Array<number>();
    private scratch = new Array<number>();

    private clipAttachment: ClippingAttachment | null = null;
    private clippingPolygons: Array<Array<number>> | null = null;

    clipStart(slot: Slot, clip: ClippingAttachment): number {
        if (this.clipAttachment) return 0;
        this.clipAttachment = clip;

        const n = clip.worldVerticesLength;
        const vertices = Utils.setArraySize(this.clippingPolygon, n);

        clip.computeWorldVertices(slot, 0, n, vertices, 0, 2);
        const clippingPolygon = this.clippingPolygon;

        SkeletonClipping.makeClockwise(clippingPolygon);
        const clippingPolygons = (this.clippingPolygons = this.triangulator.decompose(clippingPolygon, this.triangulator.triangulate(clippingPolygon)));

        for (let i = 0, n = clippingPolygons.length; i < n; i++) {
            const polygon = clippingPolygons[i];

            SkeletonClipping.makeClockwise(polygon);
            polygon.push(polygon[0]);
            polygon.push(polygon[1]);
        }

        return clippingPolygons.length;
    }

    clipEndWithSlot(slot: Slot) {
        if (this.clipAttachment && this.clipAttachment.endSlot == slot.data) this.clipEnd();
    }

    clipEnd() {
        if (!this.clipAttachment) return;
        this.clipAttachment = null;
        this.clippingPolygons = null;
        this.clippedVertices.length = 0;
        this.clippedTriangles.length = 0;
        this.clippingPolygon.length = 0;
    }

    isClipping(): boolean {
        return this.clipAttachment != null;
    }

    /**
     * @deprecated Use clipTriangles without verticesLength parameter. Mark for removal in 4.3.
     */
    clipTriangles(vertices: NumberArrayLike, verticesLength: number, triangles: NumberArrayLike, trianglesLength: number): void;

    /**
     * @deprecated Use clipTriangles without verticesLength parameter. Mark for removal in 4.3.
     */
    clipTriangles(
        vertices: NumberArrayLike,
        verticesLength: number,
        triangles: NumberArrayLike,
        trianglesLength: number,
        uvs: NumberArrayLike,
        light: Color,
        dark: Color,
        twoColor: boolean
    ): void;

    clipTriangles(vertices: NumberArrayLike, triangles: NumberArrayLike, trianglesLength: number): void;
    clipTriangles(vertices: NumberArrayLike, triangles: NumberArrayLike, trianglesLength: number, uvs: NumberArrayLike, light: Color, dark: Color, twoColor: boolean): void;
    clipTriangles(
        vertices: NumberArrayLike,
        verticesLengthOrTriangles: number | NumberArrayLike,
        trianglesOrTrianglesLength: NumberArrayLike | number,
        trianglesLengthOrUvs?: number | NumberArrayLike,
        uvsOrLight?: NumberArrayLike | Color,
        lightOrDark?: Color,
        darkOrTwoColor?: Color | boolean,
        twoColorParam?: boolean
    ): void {
        // Determine which overload is being used
        let triangles: NumberArrayLike;
        let trianglesLength: number;
        let uvs: NumberArrayLike | undefined;
        let light: Color | undefined;
        let dark: Color | undefined;
        let twoColor: boolean | undefined;

        if (typeof verticesLengthOrTriangles === 'number') {
            triangles = trianglesOrTrianglesLength as NumberArrayLike;
            trianglesLength = trianglesLengthOrUvs as number;
            uvs = uvsOrLight as NumberArrayLike;
            light = lightOrDark as Color | undefined;
            dark = darkOrTwoColor as Color | undefined;
            twoColor = twoColorParam;
        } else {
            triangles = verticesLengthOrTriangles;
            trianglesLength = trianglesOrTrianglesLength as number;
            uvs = trianglesLengthOrUvs as NumberArrayLike;
            light = uvsOrLight as Color | undefined;
            dark = lightOrDark as Color | undefined;
            twoColor = darkOrTwoColor as boolean;
        }

        if (uvs && light && dark && typeof twoColor === 'boolean') this.clipTrianglesRender(vertices, triangles, trianglesLength, uvs, light, dark, twoColor);
        else this.clipTrianglesNoRender(vertices, triangles, trianglesLength);
    }

    private clipTrianglesNoRender(vertices: NumberArrayLike, triangles: NumberArrayLike, trianglesLength: number) {
        const clipOutput = this.clipOutput;
        const clippedVertices = this.clippedVertices;
        const clippedTriangles = this.clippedTriangles;
        const polygons = this.clippingPolygons!;
        const polygonsCount = polygons.length;

        let index = 0;

        clippedVertices.length = 0;
        clippedTriangles.length = 0;
        for (let i = 0; i < trianglesLength; i += 3) {
            let vertexOffset = triangles[i] << 1;
            const x1 = vertices[vertexOffset];
            const y1 = vertices[vertexOffset + 1];

            vertexOffset = triangles[i + 1] << 1;
            const x2 = vertices[vertexOffset];
            const y2 = vertices[vertexOffset + 1];

            vertexOffset = triangles[i + 2] << 1;
            const x3 = vertices[vertexOffset];
            const y3 = vertices[vertexOffset + 1];

            for (let p = 0; p < polygonsCount; p++) {
                let s = clippedVertices.length;

                if (this.clip(x1, y1, x2, y2, x3, y3, polygons[p], clipOutput)) {
                    const clipOutputLength = clipOutput.length;

                    if (clipOutputLength == 0) continue;

                    let clipOutputCount = clipOutputLength >> 1;
                    const clipOutputItems = this.clipOutput;
                    const clippedVerticesItems = Utils.setArraySize(clippedVertices, s + clipOutputCount * 2);

                    for (let ii = 0; ii < clipOutputLength; ii += 2, s += 2) {
                        const x = clipOutputItems[ii];
                        const y = clipOutputItems[ii + 1];

                        clippedVerticesItems[s] = x;
                        clippedVerticesItems[s + 1] = y;
                    }

                    s = clippedTriangles.length;
                    const clippedTrianglesItems = Utils.setArraySize(clippedTriangles, s + 3 * (clipOutputCount - 2));

                    clipOutputCount--;
                    for (let ii = 1; ii < clipOutputCount; ii++, s += 3) {
                        clippedTrianglesItems[s] = index;
                        clippedTrianglesItems[s + 1] = index + ii;
                        clippedTrianglesItems[s + 2] = index + ii + 1;
                    }
                    index += clipOutputCount + 1;
                } else {
                    const clippedVerticesItems = Utils.setArraySize(clippedVertices, s + 3 * 2);

                    clippedVerticesItems[s] = x1;
                    clippedVerticesItems[s + 1] = y1;

                    clippedVerticesItems[s + 2] = x2;
                    clippedVerticesItems[s + 3] = y2;

                    clippedVerticesItems[s + 4] = x3;
                    clippedVerticesItems[s + 5] = y3;

                    s = clippedTriangles.length;
                    const clippedTrianglesItems = Utils.setArraySize(clippedTriangles, s + 3);

                    clippedTrianglesItems[s] = index;
                    clippedTrianglesItems[s + 1] = index + 1;
                    clippedTrianglesItems[s + 2] = index + 2;
                    index += 3;
                    break;
                }
            }
        }
    }

    private clipTrianglesRender(
        vertices: NumberArrayLike,
        triangles: NumberArrayLike,
        trianglesLength: number,
        uvs: NumberArrayLike,
        light: Color,
        dark: Color,
        twoColor: boolean
    ) {
        const clipOutput = this.clipOutput;
        const clippedVertices = this.clippedVertices;
        const clippedTriangles = this.clippedTriangles;
        const polygons = this.clippingPolygons!;
        const polygonsCount = polygons.length;
        const vertexSize = twoColor ? 12 : 8;

        let index = 0;

        clippedVertices.length = 0;
        clippedTriangles.length = 0;
        for (let i = 0; i < trianglesLength; i += 3) {
            let vertexOffset = triangles[i] << 1;
            const x1 = vertices[vertexOffset];
            const y1 = vertices[vertexOffset + 1];
            const u1 = uvs[vertexOffset];
            const v1 = uvs[vertexOffset + 1];

            vertexOffset = triangles[i + 1] << 1;
            const x2 = vertices[vertexOffset];
            const y2 = vertices[vertexOffset + 1];
            const u2 = uvs[vertexOffset];
            const v2 = uvs[vertexOffset + 1];

            vertexOffset = triangles[i + 2] << 1;
            const x3 = vertices[vertexOffset];
            const y3 = vertices[vertexOffset + 1];
            const u3 = uvs[vertexOffset];
            const v3 = uvs[vertexOffset + 1];

            for (let p = 0; p < polygonsCount; p++) {
                let s = clippedVertices.length;

                if (this.clip(x1, y1, x2, y2, x3, y3, polygons[p], clipOutput)) {
                    const clipOutputLength = clipOutput.length;

                    if (clipOutputLength == 0) continue;
                    const d0 = y2 - y3;
                    const d1 = x3 - x2;
                    const d2 = x1 - x3;
                    const d4 = y3 - y1;
                    const d = 1 / (d0 * d2 + d1 * (y1 - y3));

                    let clipOutputCount = clipOutputLength >> 1;
                    const clipOutputItems = this.clipOutput;
                    const clippedVerticesItems = Utils.setArraySize(clippedVertices, s + clipOutputCount * vertexSize);

                    for (let ii = 0; ii < clipOutputLength; ii += 2, s += vertexSize) {
                        const x = clipOutputItems[ii];
                        const y = clipOutputItems[ii + 1];

                        clippedVerticesItems[s] = x;
                        clippedVerticesItems[s + 1] = y;
                        clippedVerticesItems[s + 2] = light.r;
                        clippedVerticesItems[s + 3] = light.g;
                        clippedVerticesItems[s + 4] = light.b;
                        clippedVerticesItems[s + 5] = light.a;
                        const c0 = x - x3;
                        const c1 = y - y3;
                        const a = (d0 * c0 + d1 * c1) * d;
                        const b = (d4 * c0 + d2 * c1) * d;
                        const c = 1 - a - b;

                        clippedVerticesItems[s + 6] = u1 * a + u2 * b + u3 * c;
                        clippedVerticesItems[s + 7] = v1 * a + v2 * b + v3 * c;
                        if (twoColor) {
                            clippedVerticesItems[s + 8] = dark.r;
                            clippedVerticesItems[s + 9] = dark.g;
                            clippedVerticesItems[s + 10] = dark.b;
                            clippedVerticesItems[s + 11] = dark.a;
                        }
                    }

                    s = clippedTriangles.length;
                    const clippedTrianglesItems = Utils.setArraySize(clippedTriangles, s + 3 * (clipOutputCount - 2));

                    clipOutputCount--;
                    for (let ii = 1; ii < clipOutputCount; ii++, s += 3) {
                        clippedTrianglesItems[s] = index;
                        clippedTrianglesItems[s + 1] = index + ii;
                        clippedTrianglesItems[s + 2] = index + ii + 1;
                    }
                    index += clipOutputCount + 1;
                } else {
                    const clippedVerticesItems = Utils.setArraySize(clippedVertices, s + 3 * vertexSize);

                    clippedVerticesItems[s] = x1;
                    clippedVerticesItems[s + 1] = y1;
                    clippedVerticesItems[s + 2] = light.r;
                    clippedVerticesItems[s + 3] = light.g;
                    clippedVerticesItems[s + 4] = light.b;
                    clippedVerticesItems[s + 5] = light.a;
                    if (!twoColor) {
                        clippedVerticesItems[s + 6] = u1;
                        clippedVerticesItems[s + 7] = v1;

                        clippedVerticesItems[s + 8] = x2;
                        clippedVerticesItems[s + 9] = y2;
                        clippedVerticesItems[s + 10] = light.r;
                        clippedVerticesItems[s + 11] = light.g;
                        clippedVerticesItems[s + 12] = light.b;
                        clippedVerticesItems[s + 13] = light.a;
                        clippedVerticesItems[s + 14] = u2;
                        clippedVerticesItems[s + 15] = v2;

                        clippedVerticesItems[s + 16] = x3;
                        clippedVerticesItems[s + 17] = y3;
                        clippedVerticesItems[s + 18] = light.r;
                        clippedVerticesItems[s + 19] = light.g;
                        clippedVerticesItems[s + 20] = light.b;
                        clippedVerticesItems[s + 21] = light.a;
                        clippedVerticesItems[s + 22] = u3;
                        clippedVerticesItems[s + 23] = v3;
                    } else {
                        clippedVerticesItems[s + 6] = u1;
                        clippedVerticesItems[s + 7] = v1;
                        clippedVerticesItems[s + 8] = dark.r;
                        clippedVerticesItems[s + 9] = dark.g;
                        clippedVerticesItems[s + 10] = dark.b;
                        clippedVerticesItems[s + 11] = dark.a;

                        clippedVerticesItems[s + 12] = x2;
                        clippedVerticesItems[s + 13] = y2;
                        clippedVerticesItems[s + 14] = light.r;
                        clippedVerticesItems[s + 15] = light.g;
                        clippedVerticesItems[s + 16] = light.b;
                        clippedVerticesItems[s + 17] = light.a;
                        clippedVerticesItems[s + 18] = u2;
                        clippedVerticesItems[s + 19] = v2;
                        clippedVerticesItems[s + 20] = dark.r;
                        clippedVerticesItems[s + 21] = dark.g;
                        clippedVerticesItems[s + 22] = dark.b;
                        clippedVerticesItems[s + 23] = dark.a;

                        clippedVerticesItems[s + 24] = x3;
                        clippedVerticesItems[s + 25] = y3;
                        clippedVerticesItems[s + 26] = light.r;
                        clippedVerticesItems[s + 27] = light.g;
                        clippedVerticesItems[s + 28] = light.b;
                        clippedVerticesItems[s + 29] = light.a;
                        clippedVerticesItems[s + 30] = u3;
                        clippedVerticesItems[s + 31] = v3;
                        clippedVerticesItems[s + 32] = dark.r;
                        clippedVerticesItems[s + 33] = dark.g;
                        clippedVerticesItems[s + 34] = dark.b;
                        clippedVerticesItems[s + 35] = dark.a;
                    }

                    s = clippedTriangles.length;
                    const clippedTrianglesItems = Utils.setArraySize(clippedTriangles, s + 3);

                    clippedTrianglesItems[s] = index;
                    clippedTrianglesItems[s + 1] = index + 1;
                    clippedTrianglesItems[s + 2] = index + 2;
                    index += 3;
                    break;
                }
            }
        }
    }

    public clipTrianglesUnpacked(vertices: NumberArrayLike, triangles: NumberArrayLike, trianglesLength: number, uvs: NumberArrayLike) {
        const clipOutput = this.clipOutput;
        const clippedVertices = this.clippedVertices;
        const clippedUVs = this.clippedUVs;
        const clippedTriangles = this.clippedTriangles;
        const polygons = this.clippingPolygons!;
        const polygonsCount = polygons.length;

        let index = 0;

        clippedVertices.length = 0;
        clippedUVs.length = 0;
        clippedTriangles.length = 0;
        for (let i = 0; i < trianglesLength; i += 3) {
            let vertexOffset = triangles[i] << 1;
            const x1 = vertices[vertexOffset];
            const y1 = vertices[vertexOffset + 1];
            const u1 = uvs[vertexOffset];
            const v1 = uvs[vertexOffset + 1];

            vertexOffset = triangles[i + 1] << 1;
            const x2 = vertices[vertexOffset];
            const y2 = vertices[vertexOffset + 1];
            const u2 = uvs[vertexOffset];
            const v2 = uvs[vertexOffset + 1];

            vertexOffset = triangles[i + 2] << 1;
            const x3 = vertices[vertexOffset];
            const y3 = vertices[vertexOffset + 1];
            const u3 = uvs[vertexOffset];
            const v3 = uvs[vertexOffset + 1];

            for (let p = 0; p < polygonsCount; p++) {
                let s = clippedVertices.length;

                if (this.clip(x1, y1, x2, y2, x3, y3, polygons[p], clipOutput)) {
                    const clipOutputLength = clipOutput.length;

                    if (clipOutputLength == 0) continue;
                    const d0 = y2 - y3;
                    const d1 = x3 - x2;
                    const d2 = x1 - x3;
                    const d4 = y3 - y1;
                    const d = 1 / (d0 * d2 + d1 * (y1 - y3));

                    let clipOutputCount = clipOutputLength >> 1;
                    const clipOutputItems = this.clipOutput;
                    const clippedVerticesItems = Utils.setArraySize(clippedVertices, s + clipOutputCount * 2);
                    const clippedUVsItems = Utils.setArraySize(clippedUVs, s + clipOutputCount * 2);

                    for (let ii = 0; ii < clipOutputLength; ii += 2, s += 2) {
                        const x = clipOutputItems[ii];
                        const y = clipOutputItems[ii + 1];

                        clippedVerticesItems[s] = x;
                        clippedVerticesItems[s + 1] = y;
                        const c0 = x - x3;
                        const c1 = y - y3;
                        const a = (d0 * c0 + d1 * c1) * d;
                        const b = (d4 * c0 + d2 * c1) * d;
                        const c = 1 - a - b;

                        clippedUVsItems[s] = u1 * a + u2 * b + u3 * c;
                        clippedUVsItems[s + 1] = v1 * a + v2 * b + v3 * c;
                    }

                    s = clippedTriangles.length;
                    const clippedTrianglesItems = Utils.setArraySize(clippedTriangles, s + 3 * (clipOutputCount - 2));

                    clipOutputCount--;
                    for (let ii = 1; ii < clipOutputCount; ii++, s += 3) {
                        clippedTrianglesItems[s] = index;
                        clippedTrianglesItems[s + 1] = index + ii;
                        clippedTrianglesItems[s + 2] = index + ii + 1;
                    }
                    index += clipOutputCount + 1;
                } else {
                    const clippedVerticesItems = Utils.setArraySize(clippedVertices, s + 3 * 2);

                    clippedVerticesItems[s] = x1;
                    clippedVerticesItems[s + 1] = y1;
                    clippedVerticesItems[s + 2] = x2;
                    clippedVerticesItems[s + 3] = y2;
                    clippedVerticesItems[s + 4] = x3;
                    clippedVerticesItems[s + 5] = y3;

                    const clippedUVSItems = Utils.setArraySize(clippedUVs, s + 3 * 2);

                    clippedUVSItems[s] = u1;
                    clippedUVSItems[s + 1] = v1;
                    clippedUVSItems[s + 2] = u2;
                    clippedUVSItems[s + 3] = v2;
                    clippedUVSItems[s + 4] = u3;
                    clippedUVSItems[s + 5] = v3;

                    s = clippedTriangles.length;
                    const clippedTrianglesItems = Utils.setArraySize(clippedTriangles, s + 3);

                    clippedTrianglesItems[s] = index;
                    clippedTrianglesItems[s + 1] = index + 1;
                    clippedTrianglesItems[s + 2] = index + 2;
                    index += 3;
                    break;
                }
            }
        }
    }

    /** Clips the input triangle against the convex, clockwise clipping area. If the triangle lies entirely within the clipping
     * area, false is returned. The clipping area must duplicate the first vertex at the end of the vertices list. */
    clip(x1: number, y1: number, x2: number, y2: number, x3: number, y3: number, clippingArea: Array<number>, output: Array<number>) {
        const originalOutput = output;
        let clipped = false;

        // Avoid copy at the end.
        let input: Array<number>;

        if (clippingArea.length % 4 >= 2) {
            input = output;
            output = this.scratch;
        } else input = this.scratch;

        input.length = 0;
        input.push(x1);
        input.push(y1);
        input.push(x2);
        input.push(y2);
        input.push(x3);
        input.push(y3);
        input.push(x1);
        input.push(y1);
        output.length = 0;

        const clippingVerticesLast = clippingArea.length - 4;
        const clippingVertices = clippingArea;

        for (let i = 0; ; i += 2) {
            const edgeX = clippingVertices[i];
            const edgeY = clippingVertices[i + 1];
            const ex = edgeX - clippingVertices[i + 2];
            const ey = edgeY - clippingVertices[i + 3];

            const outputStart = output.length;
            const inputVertices = input;

            for (let ii = 0, nn = input.length - 2; ii < nn; ) {
                const inputX = inputVertices[ii];
                const inputY = inputVertices[ii + 1];

                ii += 2;
                const inputX2 = inputVertices[ii];
                const inputY2 = inputVertices[ii + 1];
                const s2 = ey * (edgeX - inputX2) > ex * (edgeY - inputY2);
                const s1 = ey * (edgeX - inputX) - ex * (edgeY - inputY);

                if (s1 > 0) {
                    if (s2) {
                        // v1 inside, v2 inside
                        output.push(inputX2);
                        output.push(inputY2);
                        continue;
                    }
                    // v1 inside, v2 outside
                    const ix = inputX2 - inputX;
                    const iy = inputY2 - inputY;
                    const t = s1 / (ix * ey - iy * ex);

                    if (t >= 0 && t <= 1) {
                        output.push(inputX + ix * t);
                        output.push(inputY + iy * t);
                    } else {
                        output.push(inputX2);
                        output.push(inputY2);
                        continue;
                    }
                } else if (s2) {
                    // v1 outside, v2 inside
                    const ix = inputX2 - inputX;
                    const iy = inputY2 - inputY;
                    const t = s1 / (ix * ey - iy * ex);

                    if (t >= 0 && t <= 1) {
                        output.push(inputX + ix * t);
                        output.push(inputY + iy * t);
                        output.push(inputX2);
                        output.push(inputY2);
                    } else {
                        output.push(inputX2);
                        output.push(inputY2);
                        continue;
                    }
                }
                clipped = true;
            }

            if (outputStart == output.length) {
                // All edges outside.
                originalOutput.length = 0;

                return true;
            }

            output.push(output[0]);
            output.push(output[1]);

            if (i == clippingVerticesLast) break;
            const temp = output;

            output = input;
            output.length = 0;
            input = temp;
        }

        if (originalOutput != output) {
            originalOutput.length = 0;
            for (let i = 0, n = output.length - 2; i < n; i++) originalOutput[i] = output[i];
        } else originalOutput.length = originalOutput.length - 2;

        return clipped;
    }

    public static makeClockwise(polygon: NumberArrayLike) {
        const vertices = polygon;
        const verticeslength = polygon.length;

        let area = vertices[verticeslength - 2] * vertices[1] - vertices[0] * vertices[verticeslength - 1];
        let p1x = 0;
        let p1y = 0;
        let p2x = 0;
        let p2y = 0;

        for (let i = 0, n = verticeslength - 3; i < n; i += 2) {
            p1x = vertices[i];
            p1y = vertices[i + 1];
            p2x = vertices[i + 2];
            p2y = vertices[i + 3];
            area += p1x * p2y - p2x * p1y;
        }
        if (area < 0) return;

        for (let i = 0, lastX = verticeslength - 2, n = verticeslength >> 1; i < n; i += 2) {
            const x = vertices[i];
            const y = vertices[i + 1];
            const other = lastX - i;

            vertices[i] = vertices[other];
            vertices[i + 1] = vertices[other + 1];
            vertices[other] = x;
            vertices[other + 1] = y;
        }
    }
}
