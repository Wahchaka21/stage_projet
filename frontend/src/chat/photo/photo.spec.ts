import { PhotoFeature } from './photo'

describe('PhotoFeature', () => {
  it('should create', () => {
    const feat = new PhotoFeature(
      {} as any,
      {} as any,
      () => true,
      () => undefined,
      () => undefined,
      async () => { },
      () => true,
      () => undefined
    )
    expect(feat).toBeTruthy()
  })
})
