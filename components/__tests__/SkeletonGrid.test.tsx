import { render, screen } from '@testing-library/react'
import { SkeletonGrid } from '../SkeletonGrid'

describe('SkeletonGrid', () => {
  it('should render default number of skeleton cards', () => {
    const { container } = render(<SkeletonGrid />)
    const skeletonCards = container.querySelectorAll('.animate-pulse')

    expect(skeletonCards).toHaveLength(20) // Default count
  })

  it('should render custom number of skeleton cards', () => {
    const { container } = render(<SkeletonGrid count={10} />)
    const skeletonCards = container.querySelectorAll('.animate-pulse')

    expect(skeletonCards).toHaveLength(10)
  })

  it('should render with grid layout', () => {
    const { container } = render(<SkeletonGrid count={5} />)
    const gridContainer = container.firstChild

    expect(gridContainer).toHaveClass('grid')
  })

  it('should render skeleton cards with correct aspect ratio', () => {
    const { container } = render(<SkeletonGrid count={3} />)
    const skeletonCards = container.querySelectorAll('.aspect-square')

    expect(skeletonCards).toHaveLength(3)
  })

  it('should handle zero count gracefully', () => {
    const { container } = render(<SkeletonGrid count={0} />)
    const skeletonCards = container.querySelectorAll('.animate-pulse')

    expect(skeletonCards).toHaveLength(0)
  })

  it('should have responsive grid classes', () => {
    const { container } = render(<SkeletonGrid />)
    const gridContainer = container.firstChild

    expect(gridContainer).toHaveClass('grid-cols-2')
    expect(gridContainer).toHaveClass('sm:grid-cols-3')
    expect(gridContainer).toHaveClass('md:grid-cols-4')
    expect(gridContainer).toHaveClass('lg:grid-cols-5')
  })
})
