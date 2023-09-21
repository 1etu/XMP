export async function texture(
  url: string,
  signal: AbortSignal,
): Promise<ImageData | undefined> {
  let source: ImageBitmap;
  try {
    const response = await fetch(url, { signal });
    if (!response.ok) return undefined;
    source = await createImageBitmap(await response.blob());
  } catch (error) {
    if (signal.aborted) throw error;
    return undefined;
  }
  const canvas = document.createElement("canvas");
  canvas.width = source.width;
  canvas.height = source.height;
  const ctx = canvas.getContext("2d");
  if (ctx === null) {
    source.close();
    return undefined;
  }
  ctx.drawImage(source, 0, 0);
  source.close();
  return ctx.getImageData(0, 0, canvas.width, canvas.height);
}
