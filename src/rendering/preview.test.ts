import { describe, expect, it } from 'vitest'
import { makeItem } from '@/test/fixtures'
import { buildPreview, photoRect } from './preview'

describe('outfit preview layout', () => {
  it('uses photos only in photo mode and only when an item has one', () => {
    const withPhoto = makeItem('shirts', { imageUrl: 'data:image/png;base64,x' })
    const without = makeItem('jeans')
    const photo = buildPreview([withPhoto, without], 'photo')
    expect(photo.layers.map((l) => l.kind).sort()).toEqual(['photo', 'vector'])
    expect(photo.photoCount).toBe(1)
    expect(buildPreview([withPhoto], 'illustrated').layers[0].kind).toBe('vector')
  })

  it('reports pieces that cannot be drawn on the figure', () => {
    expect(buildPreview([makeItem('other')], 'illustrated').unplaced).toHaveLength(1)
  })

  it('keeps photo proportions and anchors garments where they are worn', () => {
    const zone: [number, number, number, number] = [72, 206, 96, 384]
    const [, y, w, h] = photoRect(zone, 'bottom', { width: 300, height: 700 })
    expect(y).toBe(206) // waist
    expect(w / h).toBeCloseTo(300 / 700, 5)
    const shoes = photoRect([86, 552, 68, 60], 'shoes', { width: 600, height: 300 })
    expect(shoes[1] + shoes[3]).toBeCloseTo(612, 5) // sits on the floor
  })
})
