import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { IORegistry, BUILTIN_IO_FORMATS } from '@open-pencil/core/io'
import { computeAllLayouts } from '@open-pencil/core/layout'

const [input, outputDir] = process.argv.slice(2)
if (!input || !outputDir) throw new Error('Usage: inspect-figma.mjs <input.fig> <output-dir>')

const io = new IORegistry(BUILTIN_IO_FORMATS)
const bytes = new Uint8Array(await readFile(input))
const { graph } = await io.readDocument({ name: input, data: bytes })
computeAllLayouts(graph)

const nodes = [...graph.getAllNodes()]
const nodeById = new Map(nodes.map((node) => [node.id, node]))
const depthOf = (node) => {
  let depth = 0
  let current = node
  while (current?.parentId && nodeById.has(current.parentId)) {
    depth += 1
    current = nodeById.get(current.parentId)
  }
  return depth
}
const paint = (fill) => fill?.type === 'SOLID'
  ? `rgba(${Math.round(fill.color.r * 255)},${Math.round(fill.color.g * 255)},${Math.round(fill.color.b * 255)},${fill.opacity ?? 1})`
  : fill?.type

const inventory = {
  source: input,
  counts: Object.fromEntries([...new Set(nodes.map((node) => node.type))].sort().map((type) => [type, nodes.filter((node) => node.type === type).length])),
  pages: graph.getPages(true).map((page) => ({ id: page.id, name: page.name, children: page.childIds.length })),
  variables: [...graph.variables.values()],
  variableCollections: [...graph.variableCollections.values()],
  nodes: nodes.map((node) => ({
    id: node.id,
    parentId: node.parentId,
    depth: depthOf(node),
    type: node.type,
    name: node.name,
    width: node.width,
    height: node.height,
    x: node.x,
    y: node.y,
    visible: node.visible,
    childCount: node.childIds.length,
    text: node.type === 'TEXT' ? node.text : undefined,
    fontFamily: node.type === 'TEXT' ? node.fontFamily : undefined,
    fontSize: node.type === 'TEXT' ? node.fontSize : undefined,
    fontWeight: node.type === 'TEXT' ? node.fontWeight : undefined,
    cornerRadius: node.cornerRadius,
    fills: node.fills.map(paint),
    strokes: node.strokes.map((stroke) => ({ color: paint({ type: 'SOLID', color: stroke.color, opacity: stroke.opacity }), weight: stroke.weight })),
    effects: node.effects,
    componentId: node.componentId,
    variantPropSpecs: node.variantPropSpecs,
    componentPropertyDefinitions: node.componentPropertyDefinitions,
    componentPropertyValues: node.componentPropertyValues,
    boundVariables: node.boundVariables,
    pluginData: node.pluginData,
  })),
}

await mkdir(outputDir, { recursive: true })
await writeFile(`${outputDir}/inventory.json`, JSON.stringify(inventory, null, 2))

const exportTargets = nodes.filter((node) =>
  node.parentId && node.visible &&
  ['FRAME', 'COMPONENT', 'COMPONENT_SET'].includes(node.type) &&
  depthOf(node) <= 2 && node.width > 0 && node.height > 0
)

for (const node of exportTargets) {
  const safeName = node.name.replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/^-|-$/g, '').slice(0, 80) || 'node'
  try {
    const result = await io.exportContent('png', { graph, target: { scope: 'node', nodeId: node.id } }, { format: 'PNG', scale: 1 })
    await writeFile(`${outputDir}/${node.id.replace(':', '-')}-${safeName}.png`, result.data)
    const vector = await io.exportContent('svg', { graph, target: { scope: 'node', nodeId: node.id } }, { format: 'SVG' })
    await writeFile(`${outputDir}/${node.id.replace(':', '-')}-${safeName}.svg`, vector.data)
  } catch (error) {
    inventory.exportErrors ??= []
    inventory.exportErrors.push({ id: node.id, name: node.name, error: String(error) })
  }
}

await writeFile(`${outputDir}/inventory.json`, JSON.stringify(inventory, null, 2))
console.log(JSON.stringify({ counts: inventory.counts, pages: inventory.pages, exported: exportTargets.length, errors: inventory.exportErrors?.length ?? 0 }))
