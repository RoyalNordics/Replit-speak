export type FileResult = { path:string; ok:boolean; before:string; after:string; error?:string }
export type ParsedDiff = { path:string; hunks:any[] }

function normalizeLines(str:string){ return str.replace(/\r\n/g,'\n').split('\n') }

export function parseUnifiedDiff(text:string): ParsedDiff[] {
  const lines = normalizeLines(text)
  const results: ParsedDiff[] = []
  let current: ParsedDiff | null = null
  for (let l of lines){
    if (l.startsWith('diff --git') || l.startsWith('--- ') || l.startsWith('+++ ')){
      if (l.startsWith('diff --git')){
        const parts = l.split(' ')
        const path = parts[2].replace(/^a\//,'')
        current = { path, hunks:[] }
        results.push(current)
      }
    } else if (l.startsWith('@@')){
      if (current){
        current.hunks.push({ header:l, lines:[] })
      }
    } else if (current && current.hunks.length){
      current.hunks[current.hunks.length-1].lines.push(l)
    }
  }
  return results
}

export function applyUnifiedDiff(files:Record<string,string>, diffText:string){
  const results: FileResult[] = []
  let nextFiles = { ...files }
  const diffs = parseUnifiedDiff(diffText)
  for (let d of diffs){
    const before = files[d.path] || ''
    let after = ''
    try{
      let newLines = normalizeLines(before)
      for (let h of d.hunks){
        const m = /@@ -(\d+),?(\d*) \+(\d+),?(\d*) @@/.exec(h.header)
        if (!m) continue
        let oldStart = parseInt(m[1])
        let newStart = parseInt(m[3])
        let outLines:string[] = []
        let idxOld = oldStart-1
        let idx = 0
        for (let line of h.lines){
          if (line.startsWith(' ')){
            outLines.push(newLines[idxOld++]||'')
          } else if (line.startsWith('-')){
            idxOld++
          } else if (line.startsWith('+')){
            outLines.push(line.substring(1))
          }
          idx++
        }
        newLines = outLines
      }
      after = newLines.join('\n')
      nextFiles[d.path] = after
      results.push({ path:d.path, ok:true, before, after })
    }catch(e:any){
      results.push({ path:d.path, ok:false, before, after, error:e.message })
    }
  }
  return { results, nextFiles }
}