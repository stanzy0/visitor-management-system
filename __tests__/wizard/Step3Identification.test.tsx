import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import Step3Identification from '@/components/wizard/Step3Identification'

const baseData = {
  doc_type: '',
  doc_number: '',
  expiry_date: '',
  doc_front_url: '',
  doc_back_url: '',
  issuing_country: '',
  doc_front_image: null,
  doc_back_image: null,
  id_verification: false,
}

describe('Step3Identification', () => {
  it('shows identification fields by default', () => {
    render(
      <Step3Identification
        data={baseData}
        onChange={vi.fn()}
        onBlur={vi.fn()}
      />
    )

    expect(screen.getByText('Identification')).toBeInTheDocument()
    expect(screen.getByText('ID Type *')).toBeInTheDocument()
    expect(screen.getByText('Document Number *')).toBeInTheDocument()
    expect(screen.getByText('Expiry Date *')).toBeInTheDocument()
    expect(screen.getByText('Issuing Country *')).toBeInTheDocument()
    expect(screen.getByText('Upload scanned documents.')).toBeInTheDocument()
  })

  it('allows Next when no-identification checkbox is checked', () => {
    const onChange = vi.fn()
    render(
      <Step3Identification
        data={baseData}
        onChange={onChange}
        onBlur={vi.fn()}
      />
    )

    const checkbox = screen.getByRole('checkbox')
    fireEvent.click(checkbox)

    expect(onChange).toHaveBeenCalledWith('id_verification', true)
  })

  it('clears identification values when no-identification is checked and does not cause infinite loop', async () => {
    const onChange = vi.fn()
    const filledData = {
      ...baseData,
      doc_type: 'Passport',
      doc_number: 'A1234567',
      expiry_date: '2030-01-01',
      issuing_country: 'Nigeria',
      doc_front_url: 'http://example.com/front.jpg',
      doc_back_url: 'http://example.com/back.jpg',
      id_verification: false,
    }

    const { rerender } = render(
      <Step3Identification
        data={filledData}
        onChange={onChange}
        onBlur={vi.fn()}
      />
    )

    const checkbox = screen.getByRole('checkbox')
    fireEvent.click(checkbox)

    expect(onChange).toHaveBeenCalledWith('id_verification', true)
    expect(onChange).toHaveBeenCalledWith('doc_type', '')
    expect(onChange).toHaveBeenCalledWith('doc_number', '')
    expect(onChange).toHaveBeenCalledWith('expiry_date', '')
    expect(onChange).toHaveBeenCalledWith('issuing_country', '')
    expect(onChange).toHaveBeenCalledWith('doc_front_url', '')
    expect(onChange).toHaveBeenCalledWith('doc_back_url', '')
    expect(onChange).toHaveBeenCalledWith('doc_front_image', null)
    expect(onChange).toHaveBeenCalledWith('doc_back_image', null)

    rerender(
      <Step3Identification
        data={{ ...filledData, id_verification: true }}
        onChange={onChange}
        onBlur={vi.fn()}
      />
    )

    await waitFor(() => {
      expect(screen.getByText('No identification document provided.')).toBeInTheDocument()
    })
  })

  it('disables identification fields when no-identification is checked', () => {
    const { rerender } = render(
      <Step3Identification
        data={baseData}
        onChange={vi.fn()}
        onBlur={vi.fn()}
      />
    )

    const checkbox = screen.getByRole('checkbox')
    fireEvent.click(checkbox)

    rerender(
      <Step3Identification
        data={{ ...baseData, id_verification: true }}
        onChange={vi.fn()}
        onBlur={vi.fn()}
      />
    )

    expect(screen.getByText('No identification document provided.')).toBeInTheDocument()

    const selects = screen.getAllByRole('combobox')
    const textInputs = screen.getAllByRole('textbox')

    selects.forEach(el => expect(el).toBeDisabled())
    textInputs.forEach(el => expect(el).toBeDisabled())
  })

  it('shows validation errors for incomplete identification when required', () => {
    render(
      <Step3Identification
        data={baseData}
        onChange={vi.fn()}
        onBlur={vi.fn()}
        errors={{
          doc_type: 'ID Type is required.',
          doc_number: 'ID Number is required.',
          issuing_country: 'Issuing Country is required.',
          expiry_date: 'Expiry Date is required.',
        }}
        touched={new Set(['doc_type', 'doc_number', 'issuing_country', 'expiry_date'])}
      />
    )

    expect(screen.getByText('ID Type is required.')).toBeInTheDocument()
    expect(screen.getByText('ID Number is required.')).toBeInTheDocument()
    expect(screen.getByText('Issuing Country is required.')).toBeInTheDocument()
    expect(screen.getByText('Expiry Date is required.')).toBeInTheDocument()
  })

  it('does not show validation errors when no-identification is checked', () => {
    render(
      <Step3Identification
        data={{ ...baseData, id_verification: true }}
        onChange={vi.fn()}
        onBlur={vi.fn()}
        errors={{
          doc_type: 'ID Type is required.',
          doc_number: 'ID Number is required.',
        }}
        touched={new Set(['doc_type', 'doc_number'])}
      />
    )

    expect(screen.queryByText('ID Type is required.')).not.toBeInTheDocument()
    expect(screen.queryByText('ID Number is required.')).not.toBeInTheDocument()
  })

  it('does not produce maximum update depth error when checking no-identification', () => {
    const onChange = vi.fn()
    const { container } = render(
      <Step3Identification
        data={baseData}
        onChange={onChange}
        onBlur={vi.fn()}
      />
    )

    const checkbox = screen.getByRole('checkbox')
    fireEvent.click(checkbox)

    expect(container).toBeTruthy()
    expect(screen.getByText('Identification')).toBeInTheDocument()
  })
})
