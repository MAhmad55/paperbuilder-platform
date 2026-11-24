// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, within, tx } from './test-utils'
import { Table, type TableColumn } from './Table'

interface Person {
  id: string
  name: string
  city: string
}

const rows: Person[] = [
  { id: 'r1', name: 'Zara', city: 'Lahore' },
  { id: 'r2', name: 'Ali', city: 'Karachi' },
  { id: 'r3', name: 'Mina', city: 'Multan' },
]

const columns: TableColumn<Person>[] = [
  { id: 'name', header: 'Name', cell: (r) => r.name, sortable: true },
  { id: 'city', header: 'City', cell: (r) => r.city, sortable: true },
]

/** The Table reads the 768px breakpoint through window.matchMedia.
    jsdom has no real media queries, so the viewport is stubbed per test. */
function stubMatchMedia(matches: boolean) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  })
}

stubMatchMedia(false)

function bodyRowNames(): string[] {
  const table = screen.getByRole('table')
  return within(table)
    .getAllByRole('row')
    .slice(1)
    .map((row) => row.textContent ?? '')
}

describe('Table rendering', () => {
  it('renders one header per column and one body row per data row, in given order', () => {
    render(<Table columns={columns} data={rows} />)
    expect(screen.getByRole('columnheader', { name: 'Name' })).toBeTruthy()
    expect(screen.getByRole('columnheader', { name: 'City' })).toBeTruthy()
    expect(bodyRowNames()).toEqual(['ZaraLahore', 'AliKarachi', 'MinaMultan'])
  })

  it('gives every header cell scope="col"', () => {
    render(<Table columns={columns} data={rows} />)
    const headers = within(screen.getByRole('table')).getAllByRole('columnheader')
    expect(headers).toHaveLength(2)
    headers.forEach((th) => expect(th.getAttribute('scope')).toBe('col'))
  })

  it('applies the aria-label passed by the caller to the table', () => {
    render(<Table columns={columns} data={rows} ariaLabel="Students" />)
    expect(screen.getByRole('table', { name: 'Students' })).toBeTruthy()
  })

  it('renders the mobile card list with the first column as the card heading', () => {
    stubMatchMedia(true)
    const { container } = render(<Table columns={columns} data={rows} />)
    const cards = container.querySelectorAll('.pb-table__cards .pb-table-card')
    expect(cards).toHaveLength(3)
    expect(cards[0].querySelector('strong')?.textContent).toBe('Zara')
    expect(cards[0].textContent).toContain('City')
    expect(cards[0].textContent).toContain('Lahore')
    stubMatchMedia(false)
  })

  it('renders only one representation: the desktop table, no card list', () => {
    const { container } = render(<Table columns={columns} data={rows} selectable />)
    expect(screen.getByRole('table')).toBeTruthy()
    expect(container.querySelector('.pb-table__cards')).toBeNull()
    // Each row checkbox exists exactly once — no duplicate controls.
    expect(screen.getAllByLabelText(tx('common.selectRow', { id: 'r1' }))).toHaveLength(1)
    expect(screen.getAllByLabelText(tx('common.selectAllRows'))).toHaveLength(1)
  })

  it('renders only one representation below the breakpoint: cards, no table', () => {
    stubMatchMedia(true)
    const { container } = render(<Table columns={columns} data={rows} selectable />)
    expect(screen.queryByRole('table')).toBeNull()
    expect(container.querySelectorAll('.pb-table__cards .pb-table-card')).toHaveLength(3)
    expect(screen.getAllByLabelText(tx('common.selectRow', { id: 'r1' }))).toHaveLength(1)
    stubMatchMedia(false)
  })
})

describe('Table aria-sort', () => {
  it('marks a sortable column aria-sort="none" before sorting', () => {
    render(<Table columns={columns} data={rows} />)
    expect(screen.getByRole('columnheader', { name: 'Name' }).getAttribute('aria-sort')).toBe('none')
  })

  it('marks the sorted column ascending, then descending', () => {
    render(<Table columns={columns} data={rows} />)
    const sortButton = screen.getByRole('button', { name: 'Name' })
    fireEvent.click(sortButton)
    expect(screen.getByRole('columnheader', { name: 'Name' }).getAttribute('aria-sort')).toBe('ascending')
    fireEvent.click(sortButton)
    expect(screen.getByRole('columnheader', { name: 'Name' }).getAttribute('aria-sort')).toBe('descending')
  })

  it('leaves a non-sortable column header without aria-sort', () => {
    const fixed: TableColumn<Person>[] = [
      { id: 'name', header: 'Name', cell: (r) => r.name, sortable: false },
      { id: 'city', header: 'City', cell: (r) => r.city },
    ]
    render(<Table columns={fixed} data={rows} />)
    expect(screen.getByRole('columnheader', { name: 'Name' }).getAttribute('aria-sort')).toBeNull()
  })
})

describe('Table sorting', () => {
  it('sorts ascending by the clicked column on first click', () => {
    render(<Table columns={columns} data={rows} />)
    fireEvent.click(screen.getByRole('button', { name: 'Name' }))
    expect(bodyRowNames()).toEqual(['AliKarachi', 'MinaMultan', 'ZaraLahore'])
  })

  it('sorts descending by the same column on second click', () => {
    render(<Table columns={columns} data={rows} />)
    const sortButton = screen.getByRole('button', { name: 'Name' })
    fireEvent.click(sortButton)
    fireEvent.click(sortButton)
    expect(bodyRowNames()).toEqual(['ZaraLahore', 'MinaMultan', 'AliKarachi'])
  })

  it('renders a non-sortable column header as plain text, with no sort button', () => {
    const fixed: TableColumn<Person>[] = [
      { id: 'name', header: 'Name', cell: (r) => r.name, sortable: false },
      { id: 'city', header: 'City', cell: (r) => r.city },
    ]
    render(<Table columns={fixed} data={rows} />)
    expect(screen.queryByRole('button', { name: 'Name' })).toBeNull()
    expect(screen.getByRole('columnheader', { name: 'Name' }).textContent).toBe('Name')
  })
})

describe('Table empty state', () => {
  it('shows the caller-provided empty title and body and no table when data is empty', () => {
    render(
      <Table
        columns={columns}
        data={[]}
        emptyTitle="No students yet"
        emptyBody="Add your first student to get started."
      />,
    )
    expect(screen.queryByRole('table')).toBeNull()
    expect(screen.getByText('No students yet')).toBeTruthy()
    expect(screen.getByText('Add your first student to get started.')).toBeTruthy()
    expect(screen.getByRole('status')).toBeTruthy()
  })

  it('falls back to the fragment empty copy when no empty props are given', () => {
    render(<Table columns={columns} data={[]} />)
    expect(screen.getByText(tx('common.tableEmptyTitle'))).toBeTruthy()
    expect(screen.getByText(tx('common.tableEmptyBody'))).toBeTruthy()
  })

  it('calls the empty-action handler when its button is clicked', () => {
    const onClick = vi.fn()
    render(
      <Table
        columns={columns}
        data={[]}
        emptyAction={{ label: 'Add student', onClick }}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Add student' }))
    expect(onClick).toHaveBeenCalledTimes(1)
  })
})

describe('Table row selection', () => {
  // The Table renders exactly one representation (desktop table above
  // 768px, mobile cards below), so row checkboxes are unique in the DOM.
  function tableCheckbox(label: string): HTMLInputElement {
    return within(screen.getByRole('table')).getByLabelText(label) as HTMLInputElement
  }

  it('shows no selection bar until a row is selected, then shows the count', () => {
    render(<Table columns={columns} data={rows} selectable />)
    expect(screen.queryByText(tx('common.tableSelected', { count: 1 }))).toBeNull()
    fireEvent.click(tableCheckbox(tx('common.selectRow', { id: 'r2' })))
    expect(screen.getByText(tx('common.tableSelected', { count: 1 }))).toBeTruthy()
  })

  it('select-all selects every row and Clear removes the selection', () => {
    render(<Table columns={columns} data={rows} selectable />)
    fireEvent.click(tableCheckbox(tx('common.selectAllRows')))
    expect(screen.getByText(tx('common.tableSelected', { count: 3 }))).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: tx('common.clear') }))
    expect(screen.queryByText(tx('common.tableSelected', { count: 3 }))).toBeNull()
  })

  it('unchecking a selected row removes it from the count', () => {
    render(<Table columns={columns} data={rows} selectable />)
    const rowBox = tableCheckbox(tx('common.selectRow', { id: 'r1' }))
    fireEvent.click(rowBox)
    expect(rowBox.checked).toBe(true)
    expect(screen.getByText(tx('common.tableSelected', { count: 1 }))).toBeTruthy()
    fireEvent.click(rowBox)
    expect(rowBox.checked).toBe(false)
    expect(screen.queryByText(tx('common.tableSelected', { count: 1 }))).toBeNull()
  })

  it('renders no row checkboxes when not selectable', () => {
    render(<Table columns={columns} data={rows} />)
    expect(screen.queryAllByLabelText(tx('common.selectAllRows'))).toHaveLength(0)
    expect(screen.queryAllByLabelText(tx('common.selectRow', { id: 'r1' }))).toHaveLength(0)
  })
})
