import { render, screen, fireEvent } from '@testing-library/react'
import Step5VehicleInfo from '@/components/wizard/Step5VehicleInfo'
import type { VisitorFormData } from '@/lib/types/visitor'

describe('Step5VehicleInfo', () => {
  const defaultProps = {
    has_vehicle: true,
    vehicle_make: '',
    vehicle_model: '',
    vehicle_color: '',
    registration_number: '',
    onChange: vi.fn(),
    errors: {},
    touched: new Set<string>(),
    onBlur: vi.fn(),
  }

  beforeAll(() => {
    window.HTMLElement.prototype.scrollIntoView = vi.fn()
  })

  it('renders make, model, color, and plate fields when has_vehicle is true', () => {
    render(<Step5VehicleInfo {...defaultProps} />)
    expect(screen.getByText('Make *')).toBeInTheDocument()
    expect(screen.getByText('Model *')).toBeInTheDocument()
    expect(screen.getByText('Color *')).toBeInTheDocument()
    expect(screen.getByText('Plate Number *')).toBeInTheDocument()
  })

  it('does not render fields when has_vehicle is false', () => {
    render(<Step5VehicleInfo {...defaultProps} has_vehicle={false} />)
    expect(screen.queryByText('Make *')).not.toBeInTheDocument()
  })

  it('renders make dropdown with standardized options', () => {
    render(<Step5VehicleInfo {...defaultProps} />)
    expect(screen.getByPlaceholderText('Select vehicle make...')).toBeInTheDocument()
    const makeInput = screen.getAllByRole('combobox')[0]
    fireEvent.focus(makeInput)
    fireEvent.keyDown(makeInput, { key: 'ArrowDown' })
    expect(screen.getByText('Toyota')).toBeInTheDocument()
    expect(screen.getByText('Honda')).toBeInTheDocument()
  })

  it('renders color dropdown with standardized options', () => {
    render(<Step5VehicleInfo {...defaultProps} />)
    expect(screen.getByText('Select vehicle color...')).toBeInTheDocument()
    expect(screen.getByText('Black')).toBeInTheDocument()
    expect(screen.getByText('White')).toBeInTheDocument()
    expect(screen.getByText('Other')).toBeInTheDocument()
  })

  it('model dropdown is disabled until make is selected', () => {
    render(<Step5VehicleInfo {...defaultProps} />)
    const comboboxes = screen.getAllByRole('combobox')
    expect(comboboxes[1]).toBeDisabled()
  })

  it('selecting Toyota shows Toyota models', () => {
    const onChange = vi.fn()
    const { container } = render(<Step5VehicleInfo {...defaultProps} onChange={onChange} />)
    const makeInput = container.querySelector('input[role="combobox"]') as HTMLElement
    fireEvent.focus(makeInput)
    fireEvent.keyDown(makeInput, { key: 'ArrowDown' })
    fireEvent.keyDown(makeInput, { key: 'Enter' })
    expect(onChange).toHaveBeenCalledWith('vehicle_make', 'Toyota')
  })

  it('selecting Honda shows Honda models', () => {
    const onChange = vi.fn()
    const { container } = render(<Step5VehicleInfo {...defaultProps} onChange={onChange} />)
    const makeInput = container.querySelector('input[role="combobox"]') as HTMLElement
    fireEvent.focus(makeInput)
    fireEvent.keyDown(makeInput, { key: 'ArrowDown' })
    fireEvent.keyDown(makeInput, { key: 'ArrowDown' })
    fireEvent.keyDown(makeInput, { key: 'Enter' })
    expect(onChange).toHaveBeenCalledWith('vehicle_make', 'Honda')
  })

  it('changing make clears model', () => {
    const onChange = vi.fn()
    render(<Step5VehicleInfo {...defaultProps} vehicle_make="Toyota" vehicle_model="Corolla" onChange={onChange} />)
    const makeInput = screen.getAllByRole('combobox')[0]
    fireEvent.focus(makeInput)
    fireEvent.keyDown(makeInput, { key: 'ArrowDown' })
    fireEvent.keyDown(makeInput, { key: 'ArrowDown' })
    fireEvent.keyDown(makeInput, { key: 'Enter' })
    expect(onChange).toHaveBeenCalledWith('vehicle_model', '')
  })

  it('allows selecting Other for make and entering custom value', () => {
    const onChange = vi.fn()
    render(<Step5VehicleInfo {...defaultProps} vehicle_make="Other" onChange={onChange} />)
    const customInput = screen.getByPlaceholderText('Enter vehicle make')
    fireEvent.change(customInput, { target: { value: 'Custom Make' } })
    expect(onChange).toHaveBeenCalledWith('vehicle_make', 'Custom Make')
  })

  it('allows selecting Other for model and entering custom value', () => {
    const onChange = vi.fn()
    render(<Step5VehicleInfo {...defaultProps} vehicle_make="Toyota" vehicle_model="Other" onChange={onChange} />)
    const customInput = screen.getByPlaceholderText('Enter vehicle model')
    fireEvent.change(customInput, { target: { value: 'Custom Model' } })
    expect(onChange).toHaveBeenCalledWith('vehicle_model', 'Custom Model')
  })

  it('allows selecting Other for color and entering custom value', () => {
    const onChange = vi.fn()
    render(<Step5VehicleInfo {...defaultProps} vehicle_color="Other" onChange={onChange} />)
    const customInput = screen.getByPlaceholderText('Enter vehicle color')
    fireEvent.change(customInput, { target: { value: 'Custom Color' } })
    expect(onChange).toHaveBeenCalledWith('vehicle_color', 'Custom Color')
  })
})
