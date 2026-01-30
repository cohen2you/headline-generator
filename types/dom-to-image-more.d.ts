declare module 'dom-to-image-more' {
  interface Options {
    quality?: number;
    bgcolor?: string;
    width?: number;
    height?: number;
    style?: Record<string, string | number>;
  }

  interface DomToImage {
    toBlob: (node: HTMLElement, options?: Options) => Promise<Blob>;
    toPng: (node: HTMLElement, options?: Options) => Promise<string>;
    toJpeg: (node: HTMLElement, options?: Options) => Promise<string>;
    toSvg: (node: HTMLElement, options?: Options) => Promise<string>;
  }

  const domToImage: DomToImage;
  export default domToImage;
}
