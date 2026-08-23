import { render, screen, fireEvent } from '@testing-library/react'
import Step6EmergencyContact from '@/components/wizard/Step6EmergencyContact'

describe('Step6EmergencyContact', () => {
  const defaultProps = {
    emergency_contact: '',
    emergency_relationship: '',
    emergency_phone: '',
    onChange: vi.fn(),
    errors: {},
    touched: new Set<string>(),
    onBlur: vi.fn(),
  }

  it('renders relationship dropdown with standardized options', () => {
    render(<Step6EmergencyContact {...defaultProps} />)
    expect(screen.getByText('Select relationship...')).toBeInTheDocument()
    expect(screen.getByText('Father')).toBeInTheDocument()
    expect(screen.getByText('Mother')).toBeInTheDocument()
    expect(screen.getByText('Other')).toBeInTheDocument()
  })

  it('allows selecting a predefined relationship', () => {
    const onChange = vi.fn()
    render(<Step6EmergencyContact {...defaultProps} onChange={onChange} />)
    const select = screen.getByLabelText('Relationship *')
    fireEvent.change(select, { target: { value: 'Brother' } })
    expect(onChange).toHaveBeenCalledWith('emergency_relationship', 'Brother')
  })

  it('allows selecting Other and entering custom relationship', () => {
    const onChange = vi.fn()
    render(<Step6EmergencyContact {...defaultProps} emergency_relationship="Other" onChange={onChange} />)
    const customInput = screen.getByPlaceholderText('Enter relationship')
    fireEvent.change(customInput, { target: { value: 'Neighbor' } })
    expect(onChange).toHaveBeenCalledWith('emergency_relationship', 'Neighbor')
  })

  it('clears custom relationship when a predefined option is selected', () => {
    const onChange = vi.fn()
    render(<Step6EmergencyContact {...defaultProps} emergency_relationship="Other" onChange={onChange} />)
    const select = screen.getByLabelText('Relationship *')
    fireEvent.change(select, { target: { value: 'Friend' } })
    expect(onChange).toHaveBeenCalledWith('emergency_relationship', 'Friend')
  })
})
