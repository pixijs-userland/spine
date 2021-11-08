/**
 * @public
 */
export enum SPINE_VERSION {
    UNKNOWN = 0,
    VER37 = 37,
    VER38 = 38,
    VER40 = 40,
}

/**
 * @public
 */
export function detectSpineVersion(version: string): SPINE_VERSION {
    const ver3 = version?.substring(0, 3);
    const verNum = Math.floor(+ver3 * 10 + 1e-3);

    if (ver3 === '3.7') {
        return SPINE_VERSION.VER37;
    }
    if (ver3 === '3.8') {
        return SPINE_VERSION.VER38;
    }
    if (ver3 === '4.0') {
        return SPINE_VERSION.VER40;
    }
    // try parse old versions with 3.7
    if (verNum < SPINE_VERSION.VER37) {
        return SPINE_VERSION.VER37;
    }
    return SPINE_VERSION.UNKNOWN;
}
