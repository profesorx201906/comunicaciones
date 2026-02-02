// src/App.jsx
import { useEffect, useMemo, useState } from 'react'
import Papa from 'papaparse'
import { Container, Row, Col, Form, Table, Alert, Spinner, Badge } from 'react-bootstrap'

function parseDate(dateStr) {
  if (!dateStr) return null
  const s = String(dateStr).trim()
  if (!s) return null
  
  if (s.includes('/')) {
    const [day, month, year] = s.split('/')
    return new Date(year, month - 1, day)
  }
  
  const d = new Date(s)
  return isNaN(d.getTime()) ? null : d
}

function normalizeHeader(s) {
  return String(s ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/\s+/g, ' ')
}

function normalizeRowKeys(row) {
  const out = {}
  for (const k of Object.keys(row)) {
    out[normalizeHeader(k)] = row[k]
  }
  return out
}

function dateOnly(value) {
  const s = String(value ?? '').trim()
  if (!s) return ''
  return s.split(' ')[0].split('T')[0]
}

function isYes(value) {
  const s = String(value ?? '').trim().toLowerCase()
  return s === 'si' || s === 'sí' || s === 'yes' || s === 'true' || s === '1'
}

function calcularDias(fechaInicioStr, fechaFinStr) {
  const inicio = parseDate(fechaInicioStr)
  if (!inicio) return 0
  
  const fin = fechaFinStr ? parseDate(fechaFinStr) : new Date()
  if (!fin) return 0

  inicio.setHours(0, 0, 0, 0)
  fin.setHours(0, 0, 0, 0)

  const diffTime = fin - inicio
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
  return diffDays < 0 ? 0 : diffDays
}

export default function App() {
  const csvUrl = import.meta.env.VITE_SHEET_CSV_URL

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [rows, setRows] = useState([])
  const [filterRespondida, setFilterRespondida] = useState('todos')

  const keys = useMemo(() => ({
    peticion: normalizeHeader('Petición'),
    asignado: normalizeHeader('Asignado'),
    fecha: normalizeHeader('Fecha'),
    respondida: normalizeHeader('Respondida'),
    fechaRespuesta: normalizeHeader('FechaRespuesta'),
  }), [])

  useEffect(() => {
    async function load() {
      try {
        setLoading(true)
        setError('')
        if (!csvUrl) throw new Error('Falta VITE_SHEET_CSV_URL en el archivo .env')

        const res = await fetch(csvUrl)
        if (!res.ok) throw new Error(`Error HTTP ${res.status}`)

        const csvText = await res.text()
        const parsed = Papa.parse(csvText, { header: true, skipEmptyLines: true })
        setRows((parsed.data || []).map(normalizeRowKeys))
      } catch (e) {
        setError(e?.message || 'Error cargando datos')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [csvUrl])

  const filtered = useMemo(() => {
    if (filterRespondida === 'todos') return rows
    return rows.filter((r) => {
      const respondidaValue = isYes(r[keys.respondida])
      return filterRespondida === 'si' ? respondidaValue : !respondidaValue
    })
  }, [rows, filterRespondida, keys])

  const peticionStyle = {
    width: '500px',
    minWidth: '500px',
    maxWidth: '500px',
    wordBreak: 'break-word',
    whiteSpace: 'normal'
  }

  return (
    <Container className="py-4">
      <Row className="mb-3">
        <Col>
          <h3 className="mb-1">Gestión de Peticiones Académicas</h3>
        </Col>
      </Row>

      {error && <Alert variant="danger">{error}</Alert>}

      <Row className="g-3 align-items-end mb-4">
        <Col md={4}>
          <Form.Label>Filtrar por Respondida</Form.Label>
          <Form.Select 
            value={filterRespondida} 
            onChange={(e) => setFilterRespondida(e.target.value)}
            disabled={loading}
          >
            <option value="todos">Mostrar Todas</option>
            <option value="si">Respondidas (Sí)</option>
            <option value="no">Pendientes (No)</option>
          </Form.Select>
        </Col>

        <Col>
          <div className="d-flex align-items-center gap-2">
            {loading && <Spinner animation="border" size="sm" />}
            <span className="text-muted">Total visible:</span>
            <Badge bg="primary">{filtered.length}</Badge>
          </div>
        </Col>
      </Row>

      <Table striped bordered hover responsive className="align-middle">
        <thead className="table-dark">
          <tr style={{ height: '60px' }}>
            <th className="text-center align-middle" style={{ width: '500px' }}>Petición</th>
            <th className="text-center align-middle">Asignado</th>
            <th className="text-center align-middle">Fecha</th>
            <th className="text-center align-middle">Respondida</th>
            <th className="text-center align-middle">Fecha Respuesta</th>
            <th className="text-center align-middle">Días Transcurridos</th>
          </tr>
        </thead>

        <tbody>
          {filtered.map((r, idx) => {
            const respondida = r[keys.respondida]
            const fueRespondida = isYes(respondida)
            const dias = fueRespondida 
              ? calcularDias(r[keys.fecha], r[keys.fechaRespuesta])
              : calcularDias(r[keys.fecha], null)

            return (
              <tr key={idx}>
                <td style={peticionStyle}>
                  {r[keys.peticion] || ''}
                </td>
                <td>{r[keys.asignado] || ''}</td>
                <td className="text-center">{dateOnly(r[keys.fecha])}</td>
                
                {/* Columna con solo emojis */}
                <td className="text-center" style={{ fontSize: '1.2rem' }}>
                  {fueRespondida ? '✅' : '❌'}
                </td>

                <td className="text-center">{dateOnly(r[keys.fechaRespuesta])}</td>
                <td className="text-center fw-bold">
                  {dias} {dias === 1 ? 'día' : 'días'}
                </td>
              </tr>
            )
          })}

          {!loading && filtered.length === 0 && (
            <tr>
              <td colSpan={6} className="text-center text-muted py-4">
                No hay registros para mostrar.
              </td>
            </tr>
          )}
        </tbody>
      </Table>
    </Container>
  )
}