// Codificador de códigos QR (ISO/IEC 18004) sin dependencias, en modo byte (UTF-8).
// Sigue el algoritmo de referencia de Project Nayuki (MIT): versiones 1 a 40, los cuatro niveles
// de corrección de errores y la elección de la máscara con menor penalización.
// Lo usan las páginas y el navegador: todo se calcula en el equipo de quien lo usa.

export type Ecc = "L" | "M" | "Q" | "H";

const ECC_ORDER: Ecc[] = ["L", "M", "Q", "H"];
/** Bits de formato de cada nivel (no siguen el orden L, M, Q, H) */
const FORMAT_BITS: Record<Ecc, number> = { L: 1, M: 0, Q: 3, H: 2 };

// Por nivel y versión (el índice 0 no se usa)
const ECC_CODEWORDS_PER_BLOCK: Record<Ecc, number[]> = {
    L: [-1, 7, 10, 15, 20, 26, 18, 20, 24, 30, 18, 20, 24, 26, 30, 22, 24, 28, 30, 28, 28, 28, 28, 30, 30, 26, 28, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30],
    M: [-1, 10, 16, 26, 18, 24, 16, 18, 22, 22, 26, 30, 22, 22, 24, 24, 28, 28, 26, 26, 26, 26, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28],
    Q: [-1, 13, 22, 18, 26, 18, 24, 18, 22, 20, 24, 28, 26, 24, 20, 30, 24, 28, 28, 26, 30, 28, 30, 30, 30, 30, 28, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30],
    H: [-1, 17, 28, 22, 16, 22, 28, 26, 26, 24, 28, 24, 28, 22, 24, 24, 30, 28, 28, 26, 28, 30, 24, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30],
};
const NUM_ERROR_CORRECTION_BLOCKS: Record<Ecc, number[]> = {
    L: [-1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 4, 4, 4, 4, 4, 6, 6, 6, 6, 7, 8, 8, 9, 9, 10, 12, 12, 12, 13, 14, 15, 16, 17, 18, 19, 19, 20, 21, 22, 24, 25],
    M: [-1, 1, 1, 1, 2, 2, 4, 4, 4, 5, 5, 5, 8, 9, 9, 10, 10, 11, 13, 14, 16, 17, 17, 18, 20, 21, 23, 25, 26, 28, 29, 31, 33, 35, 37, 38, 40, 43, 45, 47, 49],
    Q: [-1, 1, 1, 2, 2, 4, 4, 6, 6, 8, 8, 8, 10, 12, 16, 12, 17, 16, 18, 21, 20, 23, 23, 25, 27, 29, 34, 34, 35, 38, 40, 43, 45, 48, 51, 53, 56, 59, 62, 65, 68],
    H: [-1, 1, 1, 2, 4, 4, 4, 5, 6, 8, 8, 11, 11, 16, 16, 18, 16, 19, 21, 25, 25, 25, 34, 30, 32, 35, 37, 40, 42, 45, 48, 51, 54, 57, 60, 63, 66, 70, 74, 77, 81],
};

export interface QrCode {
    version: number;
    ecc: Ecc;
    mask: number;
    size: number;
    /** modules[y][x]: true es un módulo oscuro */
    modules: boolean[][];
}

const getBit = (value: number, index: number) => ((value >>> index) & 1) !== 0;

/** Módulos de datos y corrección que caben en una versión */
function rawDataModules(version: number) {
    let result = (16 * version + 128) * version + 64;
    if (version >= 2) {
        const align = Math.floor(version / 7) + 2;
        result -= (25 * align - 10) * align - 55;
        if (version >= 7) result -= 36;
    }
    return result;
}

const dataCodewords = (version: number, ecc: Ecc) =>
    Math.floor(rawDataModules(version) / 8) - ECC_CODEWORDS_PER_BLOCK[ecc][version] * NUM_ERROR_CORRECTION_BLOCKS[ecc][version];

/** Bits del contador de caracteres en modo byte */
const countBits = (version: number) => (version <= 9 ? 8 : 16);

/* Reed-Solomon sobre GF(2^8) con el polinomio 0x11D */

function multiply(x: number, y: number) {
    let z = 0;
    for (let i = 7; i >= 0; i--) {
        z = (z << 1) ^ ((z >>> 7) * 0x11d);
        z ^= ((y >>> i) & 1) * x;
    }
    return z;
}

function divisor(degree: number) {
    const result = new Array<number>(degree).fill(0);
    result[degree - 1] = 1;
    let root = 1;
    for (let i = 0; i < degree; i++) {
        for (let j = 0; j < result.length; j++) {
            result[j] = multiply(result[j], root);
            if (j + 1 < result.length) result[j] ^= result[j + 1];
        }
        root = multiply(root, 0x02);
    }
    return result;
}

function remainder(data: number[], div: number[]) {
    const result = div.map(() => 0);
    for (const byte of data) {
        const factor = byte ^ (result.shift() as number);
        result.push(0);
        div.forEach((coef, i) => (result[i] ^= multiply(coef, factor)));
    }
    return result;
}

/** Divide en bloques, agrega la corrección de errores y los intercala */
function addEccAndInterleave(data: number[], version: number, ecc: Ecc) {
    const numBlocks = NUM_ERROR_CORRECTION_BLOCKS[ecc][version];
    const blockEccLen = ECC_CODEWORDS_PER_BLOCK[ecc][version];
    const rawCodewords = Math.floor(rawDataModules(version) / 8);
    const numShortBlocks = numBlocks - (rawCodewords % numBlocks);
    const shortBlockLen = Math.floor(rawCodewords / numBlocks);
    const div = divisor(blockEccLen);

    const blocks: number[][] = [];
    for (let i = 0, k = 0; i < numBlocks; i++) {
        const dat = data.slice(k, k + shortBlockLen - blockEccLen + (i < numShortBlocks ? 0 : 1));
        k += dat.length;
        const eccBytes = remainder(dat, div);
        if (i < numShortBlocks) dat.push(0);
        blocks.push(dat.concat(eccBytes));
    }

    const result: number[] = [];
    for (let i = 0; i < blocks[0].length; i++) {
        blocks.forEach((block, j) => {
            if (i !== shortBlockLen - blockEccLen || j >= numShortBlocks) result.push(block[i]);
        });
    }
    return result;
}

function alignmentPositions(version: number, size: number) {
    if (version === 1) return [];
    const count = Math.floor(version / 7) + 2;
    const step = version === 32 ? 26 : Math.ceil((version * 4 + 4) / (count * 2 - 2)) * 2;
    const result = [6];
    for (let pos = size - 7; result.length < count; pos -= step) result.splice(1, 0, pos);
    return result;
}

/** Penalizaciones de la norma para elegir la máscara más legible */
function penalty(modules: boolean[][]) {
    const size = modules.length;
    let result = 0;
    const lines = [...modules, ...modules.map((_, x) => modules.map((row) => row[x]))];

    for (const line of lines) {
        // Regla 1: cinco o más módulos seguidos del mismo color
        let run = 1;
        for (let i = 1; i <= size; i++) {
            if (i < size && line[i] === line[i - 1]) run++;
            else {
                if (run >= 5) result += run - 2;
                run = 1;
            }
        }
        // Regla 3: patrones parecidos a los de esquina (1:1:3:1:1 con 4 claros a un lado)
        const bits = line.map((dark) => (dark ? "1" : "0")).join("");
        const padded = `0000${bits}0000`;
        for (let i = 0; i + 11 <= padded.length; i++) {
            const window = padded.slice(i, i + 11);
            if (window === "10111010000" || window === "00001011101") result += 40;
        }
    }
    // Regla 2: bloques de 2×2 del mismo color
    for (let y = 0; y < size - 1; y++)
        for (let x = 0; x < size - 1; x++) {
            const color = modules[y][x];
            if (color === modules[y][x + 1] && color === modules[y + 1][x] && color === modules[y + 1][x + 1]) result += 3;
        }
    // Regla 4: proporción de módulos oscuros lejos del 50 %
    const dark = modules.reduce((sum, row) => sum + row.filter(Boolean).length, 0);
    const total = size * size;
    result += (Math.ceil(Math.abs(dark * 20 - total * 10) / total) - 1) * 10;
    return result;
}

const MASKS: ((x: number, y: number) => boolean)[] = [
    (x, y) => (x + y) % 2 === 0,
    (_, y) => y % 2 === 0,
    (x) => x % 3 === 0,
    (x, y) => (x + y) % 3 === 0,
    (x, y) => (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0,
    (x, y) => ((x * y) % 2) + ((x * y) % 3) === 0,
    (x, y) => (((x * y) % 2) + ((x * y) % 3)) % 2 === 0,
    (x, y) => (((x + y) % 2) + ((x * y) % 3)) % 2 === 0,
];

/** Arma la matriz para una versión, un nivel y unos codewords ya intercalados */
function build(version: number, ecc: Ecc, codewords: number[], mask: number) {
    const size = version * 4 + 17;
    const modules = Array.from({ length: size }, () => new Array<boolean>(size).fill(false));
    const isFunction = Array.from({ length: size }, () => new Array<boolean>(size).fill(false));
    const set = (x: number, y: number, dark: boolean) => {
        modules[y][x] = dark;
        isFunction[y][x] = true;
    };

    // Patrones de sincronización
    for (let i = 0; i < size; i++) {
        set(6, i, i % 2 === 0);
        set(i, 6, i % 2 === 0);
    }
    // Patrones de las tres esquinas con su separador
    for (const [cx, cy] of [
        [3, 3],
        [size - 4, 3],
        [3, size - 4],
    ]) {
        for (let dy = -4; dy <= 4; dy++)
            for (let dx = -4; dx <= 4; dx++) {
                const dist = Math.max(Math.abs(dx), Math.abs(dy));
                const x = cx + dx;
                const y = cy + dy;
                if (x >= 0 && x < size && y >= 0 && y < size) set(x, y, dist !== 2 && dist !== 4);
            }
    }
    // Patrones de alineación
    const positions = alignmentPositions(version, size);
    const last = positions.length - 1;
    positions.forEach((ay, i) =>
        positions.forEach((ax, j) => {
            if ((i === 0 && j === 0) || (i === 0 && j === last) || (i === last && j === 0)) return;
            for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) set(ax + dx, ay + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
        }),
    );
    // Bits de formato (nivel y máscara), en sus dos copias
    const data = (FORMAT_BITS[ecc] << 3) | mask;
    let rem = data;
    for (let i = 0; i < 10; i++) rem = (rem << 1) ^ ((rem >>> 9) * 0x537);
    const format = ((data << 10) | rem) ^ 0x5412;
    for (let i = 0; i <= 5; i++) set(8, i, getBit(format, i));
    set(8, 7, getBit(format, 6));
    set(8, 8, getBit(format, 7));
    set(7, 8, getBit(format, 8));
    for (let i = 9; i < 15; i++) set(14 - i, 8, getBit(format, i));
    for (let i = 0; i < 8; i++) set(size - 1 - i, 8, getBit(format, i));
    for (let i = 8; i < 15; i++) set(8, size - 15 + i, getBit(format, i));
    set(8, size - 8, true);
    // Bits de versión, desde la 7
    if (version >= 7) {
        let r = version;
        for (let i = 0; i < 12; i++) r = (r << 1) ^ ((r >>> 11) * 0x1f25);
        const bits = (version << 12) | r;
        for (let i = 0; i < 18; i++) {
            const bit = getBit(bits, i);
            const a = size - 11 + (i % 3);
            const b = Math.floor(i / 3);
            set(a, b, bit);
            set(b, a, bit);
        }
    }

    // Datos en zigzag, de dos en dos columnas desde la esquina inferior derecha
    let bit = 0;
    for (let right = size - 1; right >= 1; right -= 2) {
        if (right === 6) right = 5;
        for (let vert = 0; vert < size; vert++)
            for (let j = 0; j < 2; j++) {
                const x = right - j;
                const upward = ((right + 1) & 2) === 0;
                const y = upward ? size - 1 - vert : vert;
                if (!isFunction[y][x] && bit < codewords.length * 8) {
                    modules[y][x] = getBit(codewords[bit >>> 3], 7 - (bit & 7));
                    bit++;
                }
            }
    }
    // Máscara solo sobre los datos
    const invert = MASKS[mask];
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) if (!isFunction[y][x] && invert(x, y)) modules[y][x] = !modules[y][x];
    return modules;
}

/**
 * Codifica un texto en el QR más pequeño posible. Si sobra espacio, sube el nivel de corrección
 * sin crecer (más resistente a manchas o a un logo encima). Lanza un error si no cabe.
 */
export function encodeText(text: string, { ecc: minEcc = "M" as Ecc, boostEcc = true, mask: forcedMask = -1 } = {}): QrCode {
    const bytes = [...new TextEncoder().encode(text)];

    let version = 1;
    for (; version <= 40; version++) if (4 + countBits(version) + bytes.length * 8 <= dataCodewords(version, minEcc) * 8) break;
    if (version > 40) throw new Error("El texto es demasiado largo para un código QR");

    let ecc = minEcc;
    if (boostEcc)
        for (const level of ECC_ORDER.slice(ECC_ORDER.indexOf(minEcc) + 1))
            if (4 + countBits(version) + bytes.length * 8 <= dataCodewords(version, level) * 8) ecc = level;

    // Modo byte, contador, datos, terminador y relleno
    const bits: number[] = [];
    const push = (value: number, length: number) => {
        for (let i = length - 1; i >= 0; i--) bits.push((value >>> i) & 1);
    };
    push(0b0100, 4);
    push(bytes.length, countBits(version));
    for (const byte of bytes) push(byte, 8);
    const capacity = dataCodewords(version, ecc) * 8;
    push(0, Math.min(4, capacity - bits.length));
    push(0, (8 - (bits.length % 8)) % 8);
    for (let pad = 0xec; bits.length < capacity; pad ^= 0xec ^ 0x11) push(pad, 8);

    const data: number[] = [];
    for (let i = 0; i < bits.length; i += 8) data.push(bits.slice(i, i + 8).reduce((byte, b) => (byte << 1) | b, 0));
    const codewords = addEccAndInterleave(data, version, ecc);

    let best: { mask: number; modules: boolean[][]; score: number } | undefined;
    // `mask` fija la máscara (0 a 7); solo sirve para pruebas
    for (let mask = 0; mask < 8; mask++) {
        if (forcedMask >= 0 && mask !== forcedMask) continue;
        const modules = build(version, ecc, codewords, mask);
        const score = penalty(modules);
        if (!best || score < best.score) best = { mask, modules, score };
    }
    return { version, ecc, mask: best!.mask, size: version * 4 + 17, modules: best!.modules };
}

/** SVG con un solo <path> (rápido y nítido a cualquier tamaño). `margin` en módulos; la norma pide 4 */
export function toSvg(qr: QrCode, { margin = 4, dark = "#000000", light = "#ffffff" } = {}) {
    const total = qr.size + margin * 2;
    let path = "";
    qr.modules.forEach((row, y) =>
        row.forEach((on, x) => {
            if (on) path += `M${x + margin},${y + margin}h1v1h-1z`;
        }),
    );
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${total} ${total}" shape-rendering="crispEdges"><rect width="100%" height="100%" fill="${light}"/><path d="${path}" fill="${dark}"/></svg>`;
}
