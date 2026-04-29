import { generateId } from '@/lib/generateId'

describe('generateId', () => {
  it('returns a valid UUID v4 string', () => {
    const id = generateId()
    expect(typeof id).toBe('string')
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i)
  })

  it('returns a unique value on every call', () => {
    const ids = Array.from({ length: 100 }, () => generateId())
    const unique = new Set(ids)
    expect(unique.size).toBe(100)
  })

  it('returns a non-empty string', () => {
    expect(generateId()).not.toBe('')
  })
})
