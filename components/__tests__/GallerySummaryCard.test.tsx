import { render, screen } from '@testing-library/react'
import { GallerySummaryCard } from '../GallerySummaryCard'

describe('GallerySummaryCard', () => {
  const defaultProps = {
    name: 'Test Gallery',
    nftsCount: 50,
    size: 'medium',
    arrangement: 'grid',
    backgroundColor: '#FF5733',
  }

  it('should render gallery name', () => {
    render(<GallerySummaryCard {...defaultProps} />)

    expect(screen.getByText('Test Gallery')).toBeInTheDocument()
  })

  it('should render "Untitled" when name is empty', () => {
    render(<GallerySummaryCard {...defaultProps} name="" />)

    expect(screen.getByText('Untitled')).toBeInTheDocument()
  })

  it('should render NFT count', () => {
    render(<GallerySummaryCard {...defaultProps} />)

    expect(screen.getByText('50')).toBeInTheDocument()
  })

  it('should render layout information', () => {
    render(<GallerySummaryCard {...defaultProps} />)

    expect(screen.getByText('medium / grid')).toBeInTheDocument()
  })

  it('should render background color', () => {
    render(<GallerySummaryCard {...defaultProps} />)

    expect(screen.getByText('#FF5733')).toBeInTheDocument()
  })

  it('should display color preview with correct background', () => {
    const { container } = render(<GallerySummaryCard {...defaultProps} />)

    const colorPreview = container.querySelector('[style*="background-color"]')
    expect(colorPreview).toHaveStyle({ backgroundColor: '#FF5733' })
  })

  it('should render all section labels', () => {
    render(<GallerySummaryCard {...defaultProps} />)

    expect(screen.getByText('Name')).toBeInTheDocument()
    expect(screen.getByText('NFTs')).toBeInTheDocument()
    expect(screen.getByText('Layout')).toBeInTheDocument()
    expect(screen.getByText('Background')).toBeInTheDocument()
  })

  it('should format layout with capitalization', () => {
    render(
      <GallerySummaryCard
        {...defaultProps}
        size="large"
        arrangement="justified"
      />
    )

    expect(screen.getByText('large / justified')).toBeInTheDocument()
  })

  it('should handle zero NFTs', () => {
    render(<GallerySummaryCard {...defaultProps} nftsCount={0} />)

    expect(screen.getByText('0')).toBeInTheDocument()
  })

  it('should have correct styling classes', () => {
    const { container } = render(<GallerySummaryCard {...defaultProps} />)

    const card = container.firstChild
    expect(card).toHaveClass('bg-neutral-50')
    expect(card).toHaveClass('rounded-xl')
  })
})
