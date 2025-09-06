export function isTextMime(m: string){
  return /^text\//.test(m)
    || [
      'application/json',
      'application/javascript',
      'application/xml',
      'application/yaml',
      'application/x-yaml',
      'application/toml'
    ].includes(m)
}