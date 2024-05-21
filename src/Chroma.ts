import { ColorMap } from './Colors';

type rgbA = { r: number; g: number; b: number; A?: number };
type xyzA = { x: number; y: number; z: number; A?: number };
type labA = { l: number; a: number; b: number; A?: number };
type hslA = { h: number; s: number; l: number; A?: number };
type hsvA = { h: number; s: number; v: number; A?: number };
type HexColor = string & { readonly __brand: unique symbol };

export class Chroma {
  private _Lab: labA = { l: 0, a: 0, b: 0 };
  private _xyz: xyzA = { x: 0, y: 0, z: 0 };
  private _rgb: rgbA = { r: 0, g: 0, b: 0 };
  private _hsl: hslA = { h: 0, s: 0, l: 0 };
  private _hsv: hsvA = { h: 0, s: 0, v: 0 };
  private _hex: string = '#000000';

  constructor(color: unknown) {
    if (typeof color === 'string') {
      this._rgb = this.parseColor(color);
    }
  }

  /**
   * Converts a hex color string to an rgbA color object.
   * @param hex - The hex color string to convert.
   * @returns A ColorObject representing the RGB color.
   */
  hexToRgbA = (hexColor: HexColor): rgbA => {
    // Remove the leading hash
    let hex = hexColor.replace(/^#/, '');

    // Handle 3-digit hex and 4-digit hex with alpha
    if (hex.length >= 3 && hex.length <= 4) {
      hex = hex
        .split('')
        .map(char => char + char)
        .join('');
    }

    const bigint = parseInt(hex, 16);
    let r = 0,
      g = 0,
      b = 0,
      A = 1;
    if (hex.length === 8) {
      r = (bigint >> 24) & 255;
      g = (bigint >> 16) & 255;
      b = (bigint >> 8) & 255;
      A = (bigint & 255) / 255;

      return { r, g, b, A };
    }

    r = (bigint >> 16) & 255;
    g = (bigint >> 8) & 255;
    b = bigint & 255;

    return { r, g, b, A };
  };

  /**
   * Converts an HSL(A) color to an RGB ColorObject.
   * @param hsl - The HSL(A) color to convert.
   * @returns A ColorObject representing the RGB color.
   */
  hslToRgbA = ({ h, s, l, A }: hslA): rgbA => {
    const c = (1 - Math.abs(2 * l - 1)) * s;
    const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    const m = l - c / 2;
    let r = 0,
      g = 0,
      b = 0;

    if (0 <= h && h < 60) {
      r = c;
      g = x;
    } else if (60 <= h && h < 120) {
      r = x;
      g = c;
    } else if (120 <= h && h < 180) {
      g = c;
      b = x;
    } else if (180 <= h && h < 240) {
      g = x;
      b = c;
    } else if (240 <= h && h < 300) {
      r = x;
      b = c;
    } else if (300 <= h && h < 360) {
      r = c;
      b = x;
    }

    r = Math.round((r + m) * 255);
    g = Math.round((g + m) * 255);
    b = Math.round((b + m) * 255);

    return { r, g, b, A };
  };

  rgbToXyz({ r, g, b }: { r: number; g: number; b: number }): {
    x: number;
    y: number;
    z: number;
  } {
    // Convert RGB to a range of 0-1
    r /= 255;
    g /= 255;
    b /= 255;

    // Apply sRGB companding
    r = r > 0.04045 ? ((r + 0.055) / 1.055) ** 2.4 : r / 12.92;
    g = g > 0.04045 ? ((g + 0.055) / 1.055) ** 2.4 : g / 12.92;
    b = b > 0.04045 ? ((b + 0.055) / 1.055) ** 2.4 : b / 12.92;

    // Convert to XYZ space using the sRGB conversion matrix
    const x = r * 0.4124564 + g * 0.3575761 + b * 0.1804375;
    const y = r * 0.2126729 + g * 0.7151522 + b * 0.072175;
    const z = r * 0.0193339 + g * 0.119192 + b * 0.9503041;

    // Scaling to D65 standard illuminant
    return { x: x * 100, y: y * 100, z: z * 100 };
  }

  xyzToLab({ x, y, z }: { x: number; y: number; z: number }): labA {
    // D65 standard illuminant
    const refX = 95.047;
    const refY = 100.0;
    const refZ = 108.883;

    x /= refX;
    y /= refY;
    z /= refZ;

    // Apply the XYZ to LAB conversion formula
    x = x > 0.008856 ? x ** (1 / 3) : 7.787 * x + 16 / 116;
    y = y > 0.008856 ? y ** (1 / 3) : 7.787 * y + 16 / 116;
    z = z > 0.008856 ? z ** (1 / 3) : 7.787 * z + 16 / 116;

    const l = 116 * y - 16;
    const a = 500 * (x - y);
    const b = 200 * (y - z);

    return { l, a, b };
  }

  /**
   * Converts a CSS color string to a rgbA color object.
   * @param colorString - The CSS color string to convert.
   * @returns A rgbA color object representing the color.
   * @throws An error if the color string is invalid.
   */
  parseColor(colorString: string): rgbA {
    // Remove whitespace and convert to lowercase
    const sanitizedColorString = colorString.trim().toLowerCase();

    // Check for named colors
    if (ColorMap.has(sanitizedColorString)) {
      return this.hexToRgbA(ColorMap.get(sanitizedColorString)! as HexColor);
    }

    // Check for hex(A) format
    if (this.isValidHexColor(sanitizedColorString)) {
      const hexColor = this.asHexColor(sanitizedColorString);
      return this.hexToRgbA(hexColor);
    }

    // Check for RGB(A) format
    const rgbaMatch = sanitizedColorString.match(
      /^rgba?\((\d+),\s*(\d+),\s*(\d+),?\s*([\d.]*)\)$/,
    );
    if (rgbaMatch) {
      const [, r, g, b, a] = rgbaMatch;
      return {
        r: parseInt(r),
        g: parseInt(g),
        b: parseInt(b),
        A: a ? parseFloat(a) : 1,
      };
    }

    // Check for HSL(A) format
    const hslaMatch = sanitizedColorString.match(
      /^hsla?\((\d+),\s*(\d+%)\s*,\s*(\d+%)\s*,?\s*([\d.]*)\)$/,
    );
    if (hslaMatch) {
      const [, h, s, l, a] = hslaMatch;
      return this.hslToRgbA({
        h: parseInt(h),
        s: parseInt(s) / 100,
        l: parseInt(l) / 100,
        A: a ? parseFloat(a) : undefined,
      });
    }

    throw new Error(`Invalid color string: ${colorString}`);
  }

  /**
   * A type predicate to check if a string is a valid hex color with optional alpha channel.
   * @param color - The input string to check.
   * @returns True if the string is a valid hex color, otherwise false.
   */
  isValidHexColor = (color: string): color is HexColor => {
    const hexRegex = /^#(?:[A-Fa-f0-9]{3}){1,2}(?:[A-Fa-f0-9]{2})?$/;
    return hexRegex.test(color);
  };

  /**
   * A method to validate and return a branded hex color string.
   * @param color - The input string to validate.
   * @returns The input string cast as a HexColor if valid.
   * @throws An error if the input string is not a valid hex color.
   */
  asHexColor = (color: string): HexColor => {
    if (!this.isValidHexColor(color)) {
      throw new Error(`Invalid hex color: ${color}`);
    }
    return color as HexColor;
  };
}
