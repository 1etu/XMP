export class TreeError extends Error {
  readonly detail: string;

  constructor(detail: string) {
    super(detail);
    this.name = "ExploreTreeError";
    this.detail = detail;
  }
}
