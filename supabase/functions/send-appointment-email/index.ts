// Supabase Edge Function — send-appointment-email
// Envía correo de confirmación con archivo .ics adjunto al paciente.
// Variables de entorno requeridas (Supabase > Settings > Edge Functions > Secrets):
//   RESEND_API_KEY   — tu API key de resend.com (gratis)
//   SENDER_EMAIL     — correo remitente verificado (ej: citas@tudominio.com)
//   SENDER_NAME      — nombre del remitente (ej: Nuvia Gestión Médica)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

/* ── Helpers ── */
function pad(n: number) { return String(n).padStart(2, '0') }

function toICSDate(date: Date) {
  return `${date.getUTCFullYear()}${pad(date.getUTCMonth()+1)}${pad(date.getUTCDate())}T${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}00Z`
}

function generateICS(params: {
  uid: string, summary: string, description: string,
  location: string, start: Date, end: Date,
  organizerName: string, organizerEmail: string,
  attendeeName: string, attendeeEmail: string,
}) {
  const now = toICSDate(new Date())
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Nuvia//Gestión Médica//ES',
    'CALSCALE:GREGORIAN',
    'METHOD:REQUEST',
    'BEGIN:VEVENT',
    `UID:${params.uid}@nuvia.app`,
    `DTSTAMP:${now}`,
    `DTSTART:${toICSDate(params.start)}`,
    `DTEND:${toICSDate(params.end)}`,
    `SUMMARY:${params.summary}`,
    `DESCRIPTION:${params.description.replace(/\n/g, '\\n')}`,
    ...(params.location ? [`LOCATION:${params.location}`] : []),
    `ORGANIZER;CN="${params.organizerName}":mailto:${params.organizerEmail}`,
    `ATTENDEE;CN="${params.attendeeName}";RSVP=TRUE;PARTSTAT=NEEDS-ACTION;ROLE=REQ-PARTICIPANT:mailto:${params.attendeeEmail}`,
    'STATUS:CONFIRMED',
    'SEQUENCE:0',
    'BEGIN:VALARM',
    'TRIGGER:-PT60M',
    'ACTION:DISPLAY',
    'DESCRIPTION:Recordatorio de cita médica',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ]
  return lines.join('\r\n')
}

function formatDateMX(date: Date) {
  return date.toLocaleDateString('es-MX', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'America/Mexico_City' })
}
function formatTimeMX(date: Date) {
  return date.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Mexico_City' })
}

/* ── Main handler ── */
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { appointment_id } = await req.json()
    if (!appointment_id) throw new Error('appointment_id requerido')

    // Supabase admin client (service role, reads all data)
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    // Fetch appointment with related data
    const { data: apt, error } = await supabase
      .from('appointments')
      .select(`
        id, fecha_hora, duracion_min, tipo, motivo, notas,
        patients(id, nombre, apellidos, email),
        doctors(id, nombre, apellidos, especialidad, email, telefono),
        clinics(nombre, direccion)
      `)
      .eq('id', appointment_id)
      .single()

    if (error || !apt) throw new Error('Cita no encontrada')

    const patient = apt.patients as any
    const doctor  = apt.doctors  as any
    const clinic  = apt.clinics  as any

    if (!patient?.email) {
      return new Response(JSON.stringify({ skipped: true, reason: 'Paciente sin correo' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const start       = new Date(apt.fecha_hora)
    const end         = new Date(start.getTime() + (apt.duracion_min || 30) * 60000)
    const doctorName  = `Dr. ${doctor?.nombre ?? ''} ${doctor?.apellidos ?? ''}`.trim()
    const patientName = `${patient.nombre} ${patient.apellidos}`
    const tipoLabel   = { presencial: 'Presencial', videoconsulta: 'Videoconsulta', urgencia: 'Urgencia' }[apt.tipo as string] ?? apt.tipo
    const location    = clinic?.nombre ? `${clinic.nombre}${clinic.direccion ? ' — ' + clinic.direccion : ''}` : ''

    // ICS calendar file
    const icsContent = generateICS({
      uid:            apt.id,
      summary:        `Cita médica — ${doctorName}`,
      description:    [
        apt.motivo ? `Motivo: ${apt.motivo}` : '',
        `Tipo: ${tipoLabel}`,
        doctor?.especialidad ? `Especialidad: ${doctor.especialidad}` : '',
        doctor?.telefono ? `Consultorio: ${doctor.telefono}` : '',
        apt.notas ? `Notas: ${apt.notas}` : '',
      ].filter(Boolean).join('\n'),
      location,
      start,
      end,
      organizerName:  doctorName,
      organizerEmail: doctor?.email ?? Deno.env.get('SENDER_EMAIL')!,
      attendeeName:   patientName,
      attendeeEmail:  patient.email,
    })

    const icsBase64 = btoa(unescape(encodeURIComponent(icsContent)))

    // HTML email body
    const htmlBody = `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;font-family:Arial,sans-serif;background:#f8fafc">
  <div style="max-width:560px;margin:32px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08)">
    <!-- Header -->
    <div style="background:linear-gradient(135deg,#0ea5e9,#0284c7);padding:32px 24px;text-align:center">
      <h1 style="margin:0;color:#fff;font-size:22px;font-weight:700">Confirmación de cita médica</h1>
      <p style="margin:6px 0 0;color:rgba(255,255,255,.85);font-size:14px">${doctorName}</p>
    </div>

    <!-- Body -->
    <div style="padding:28px 24px">
      <p style="margin:0 0 20px;color:#334155;font-size:15px">Hola <strong>${patient.nombre}</strong>,</p>
      <p style="margin:0 0 20px;color:#64748b;font-size:14px">Tu cita ha sido confirmada. Aquí están los detalles:</p>

      <!-- Card -->
      <div style="background:#f1f5f9;border-radius:12px;padding:20px;margin-bottom:24px">
        <table style="width:100%;border-collapse:collapse">
          <tr>
            <td style="padding:8px 0;color:#94a3b8;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:.05em;width:120px">📅 Fecha</td>
            <td style="padding:8px 0;color:#1e293b;font-size:14px;font-weight:600;text-transform:capitalize">${formatDateMX(start)}</td>
          </tr>
          <tr>
            <td style="padding:8px 0;color:#94a3b8;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:.05em">🕐 Hora</td>
            <td style="padding:8px 0;color:#1e293b;font-size:14px;font-weight:600">${formatTimeMX(start)} — ${formatTimeMX(end)}</td>
          </tr>
          <tr>
            <td style="padding:8px 0;color:#94a3b8;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:.05em">👨‍⚕️ Médico</td>
            <td style="padding:8px 0;color:#1e293b;font-size:14px">${doctorName}${doctor?.especialidad ? '<br><span style="color:#64748b;font-size:12px">'+doctor.especialidad+'</span>' : ''}</td>
          </tr>
          ${tipoLabel ? `<tr>
            <td style="padding:8px 0;color:#94a3b8;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:.05em">📋 Tipo</td>
            <td style="padding:8px 0;color:#1e293b;font-size:14px">${tipoLabel}</td>
          </tr>` : ''}
          ${location ? `<tr>
            <td style="padding:8px 0;color:#94a3b8;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:.05em">📍 Lugar</td>
            <td style="padding:8px 0;color:#1e293b;font-size:14px">${location}</td>
          </tr>` : ''}
          ${apt.motivo ? `<tr>
            <td style="padding:8px 0;color:#94a3b8;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:.05em">📝 Motivo</td>
            <td style="padding:8px 0;color:#1e293b;font-size:14px">${apt.motivo}</td>
          </tr>` : ''}
        </table>
      </div>

      <!-- Calendar CTA -->
      <div style="text-align:center;margin-bottom:24px">
        <p style="margin:0 0 12px;color:#64748b;font-size:13px">Abre el archivo adjunto <strong>cita.ics</strong> para agregar esta cita a tu calendario:</p>
        <div style="display:inline-flex;gap:8px;flex-wrap:wrap;justify-content:center">
          <span style="background:#e0f2fe;color:#0369a1;border-radius:20px;padding:6px 14px;font-size:12px;font-weight:600">📱 Google Calendar (Android)</span>
          <span style="background:#f0fdf4;color:#166534;border-radius:20px;padding:6px 14px;font-size:12px;font-weight:600">🍎 Apple Calendar (iPhone/Mac)</span>
          <span style="background:#eff6ff;color:#1d4ed8;border-radius:20px;padding:6px 14px;font-size:12px;font-weight:600">📆 Outlook</span>
        </div>
      </div>

      ${apt.notas ? `<div style="background:#fefce8;border:1px solid #fef08a;border-radius:10px;padding:14px;margin-bottom:20px">
        <p style="margin:0;color:#854d0e;font-size:13px"><strong>📌 Notas:</strong> ${apt.notas}</p>
      </div>` : ''}

      <p style="margin:0;color:#94a3b8;font-size:12px;text-align:center">Si necesitas cancelar o reprogramar, contacta al consultorio.</p>
    </div>

    <!-- Footer -->
    <div style="background:#f8fafc;padding:16px 24px;text-align:center;border-top:1px solid #e2e8f0">
      <p style="margin:0;color:#94a3b8;font-size:11px">Enviado por Nuvia · Gestión Médica</p>
    </div>
  </div>
</body>
</html>`

    // Send via Resend
    const resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get('RESEND_API_KEY')}`,
      },
      body: JSON.stringify({
        from:    `${Deno.env.get('SENDER_NAME') ?? 'Nuvia Gestión Médica'} <${Deno.env.get('SENDER_EMAIL')}>`,
        to:      [patient.email],
        subject: `✅ Cita confirmada — ${formatDateMX(start)} ${formatTimeMX(start)}`,
        html:    htmlBody,
        attachments: [{
          filename:    'cita.ics',
          content:     icsBase64,
          content_type: 'text/calendar; method=REQUEST',
        }],
      }),
    })

    if (!resendRes.ok) {
      const err = await resendRes.text()
      throw new Error(`Resend error: ${err}`)
    }

    return new Response(JSON.stringify({ sent: true, to: patient.email }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (err: any) {
    console.error(err)
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
