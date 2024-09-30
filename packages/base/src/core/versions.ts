/**
 * @public
 */
export enum SPINE_VERSION {
    UNKNOWN = 0,
    VER37 = 37,
    VER38 = 38,
    VER40 = 40,
    VER41 = 41,
    VER42 = 42,
}

/**
 * @public
 */
export function detectSpineVersion(version: string): SPINE_VERSION {
    const ver3 = version.substr(0, 3);
    const verNum = Math.floor(Number(ver3) * 10 + 1e-3);

    if (ver3 === '3.7') {
        return SPINE_VERSION.VER37;
    }
    if (ver3 === '3.8') {
        return SPINE_VERSION.VER38;
    }
    if (ver3 === '4.0') {
        return SPINE_VERSION.VER40;
    }
    if (ver3 === '4.1') {
        return SPINE_VERSION.VER41;
    }
    if (ver3 === '4.2') {
        return SPINE_VERSION.VER42;
    }
    // try parse old versions with 3.7
    if (verNum < SPINE_VERSION.VER37) {
        return SPINE_VERSION.VER37;
    }

    return SPINE_VERSION.UNKNOWN;
}
