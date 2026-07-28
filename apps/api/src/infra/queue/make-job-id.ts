// BullMQ usa `:` como separador interno das chaves Redis dos jobs, então um
// jobId custom com `:` derruba o boot com "Custom Id cannot contain :". Este é
// o único caminho pra montar jobId determinístico — o guard falha alto (throw)
// em vez de deixar o `:` chegar no BullMQ e virar crash de boot invisível pra
// teste que mocka a fila.
const SEGMENT_SEPARATOR = '_'

export function makeJobId(...segments: readonly (string | number)[]): string {
  if (segments.length === 0) {
    throw new Error('makeJobId requires at least one segment')
  }

  return segments
    .map((segment) => {
      const value = String(segment)
      if (value.length === 0) {
        throw new Error('makeJobId segment cannot be empty')
      }
      if (value.includes(':')) {
        throw new Error(`makeJobId segment cannot contain ":" (BullMQ reserved): "${value}"`)
      }
      return value
    })
    .join(SEGMENT_SEPARATOR)
}
