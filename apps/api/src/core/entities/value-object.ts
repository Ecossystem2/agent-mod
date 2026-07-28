export abstract class ValueObject<Props extends object> {
  protected readonly props: Props

  protected constructor(props: Props) {
    this.props = props
  }

  equals(vo?: ValueObject<Props> | null): boolean {
    if (vo === null || vo === undefined) return false
    if (vo.props === undefined) return false
    return JSON.stringify(this.props) === JSON.stringify(vo.props)
  }
}
