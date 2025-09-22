"use client"

import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Download, FileSpreadsheet, FileText, FileType } from "lucide-react"
import type { VehicleEntry } from "@/lib/api-services"
import { toast } from "@/hooks/use-toast"

interface ExportMenuProps {
  entries: VehicleEntry[]
}

export function ExportMenu({ entries }: ExportMenuProps) {
  const exportToCSV = () => {
    if (entries.length === 0) {
      toast({
        title: "Sin datos",
        description: "No hay entradas para exportar",
        variant: "destructive",
      })
      return
    }

    const headers = [
      "ID",
      "Nombre",
      "Apellidos",
      "CI",
      "Tipo Vehículo",
      "Fecha Entrada",
      "Lugar Destino",
      "Fecha Salida",
      "Fecha Creación",
    ]

    const csvContent = [
      headers.join(","),
      ...entries.map((entry) =>
        [
          entry.id,
          `"${entry.nombre}"`,
          `"${entry.apellidos}"`,
          entry.ci,
          `"${entry.tipoVehiculo.join("; ")}"`,         
          entry.fechaEntrada,
          `"${Object.entries(entry.lugarDestino)
            .map(([lugar, sublugares]) => `${lugar}: ${sublugares.join(", ")}`)
            .join("; ")}"`,
          entry.fechaSalida || "",
          entry.createdAt,
        ].join(","),
      ),
    ].join("\n")

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    const url = URL.createObjectURL(blob)
    link.setAttribute("href", url)
    link.setAttribute("download", `entradas_vehiculos_${new Date().toISOString().split("T")[0]}.csv`)
    link.style.visibility = "hidden"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    toast({
      title: "Exportación exitosa",
      description: `${entries.length} entradas exportadas a CSV`,
    })
  }

  const exportToExcel = () => {
    if (entries.length === 0) {
      toast({
        title: "Sin datos",
        description: "No hay entradas para exportar",
        variant: "destructive",
      })
      return
    }

    // Crear contenido XML para Excel
    const worksheet = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" 
            xmlns:x="urn:schemas-microsoft-com:office:excel" 
            xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta charset="UTF-8">
        <!--[if gte mso 9]>
        <xml>
          <x:ExcelWorkbook>
            <x:ExcelWorksheets>
              <x:ExcelWorksheet>
                <x:Name>Entradas de Vehículos</x:Name>
                <x:WorksheetOptions>
                  <x:DisplayGridlines/>
                </x:WorksheetOptions>
              </x:ExcelWorksheet>
            </x:ExcelWorksheets>
          </x:ExcelWorkbook>
        </xml>
        <![endif]-->
        <style>
          td {
            mso-number-format: "\\@";
            border: 0.5pt solid windowtext;
            padding: 2px 5px;
          }
          th {
            font-weight: bold;
            background-color: #E6E6E6;
            border: 0.5pt solid windowtext;
            padding: 2px 5px;
          }
        </style>
      </head>
      <body>
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Nombre</th>
              <th>Apellidos</th>
              <th>CI</th>
              <th>Tipo Vehículo</th>              
              <th>Fecha Entrada</th>
              <th>Lugar Destino</th>
              <th>Fecha Salida</th>
              <th>Fecha Creación</th>
            </tr>
          </thead>
          <tbody>
            ${entries.map(entry => `
              <tr>
                <td>${entry.id}</td>
                <td>${entry.nombre}</td>
                <td>${entry.apellidos}</td>
                <td>${entry.ci}</td>
                <td>${entry.tipoVehiculo.join("; ")}</td>              
                <td>${entry.fechaEntrada}</td>
                <td>${Object.entries(entry.lugarDestino)
                  .map(([lugar, sublugares]) => `${lugar}: ${sublugares.join(", ")}`)
                  .join("; ")}</td>
                <td>${entry.fechaSalida || ""}</td>
                <td>${entry.createdAt}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </body>
      </html>
    `

    const blob = new Blob([worksheet], { type: "application/vnd.ms-excel" })
    const link = document.createElement("a")
    const url = URL.createObjectURL(blob)
    link.setAttribute("href", url)
    link.setAttribute("download", `entradas_vehiculos_${new Date().toISOString().split("T")[0]}.xls`)
    link.style.visibility = "hidden"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    toast({
      title: "Exportación exitosa",
      description: `${entries.length} entradas exportadas a Excel`,
    })
  }

  const exportToTXT = () => {
    if (entries.length === 0) {
      toast({
        title: "Sin datos",
        description: "No hay entradas para exportar",
        variant: "destructive",
      })
      return
    }

    const txtContent = entries.map(entry => 
      `ID: ${entry.id}
Nombre: ${entry.nombre}
Apellidos: ${entry.apellidos}
CI: ${entry.ci}
Tipo Vehículo: ${entry.tipoVehiculo.join("; ")}
Fecha Entrada: ${entry.fechaEntrada}
Lugar Destino: ${Object.entries(entry.lugarDestino)
  .map(([lugar, sublugares]) => `${lugar}: ${sublugares.join(", ")}`)
  .join("; ")}
Fecha Salida: ${entry.fechaSalida || "N/A"}
Fecha Creación: ${entry.createdAt}
----------------------------------------`
    ).join("\n\n")

    const blob = new Blob([txtContent], { type: "text/plain;charset=utf-8" })
    const link = document.createElement("a")
    const url = URL.createObjectURL(blob)
    link.setAttribute("href", url)
    link.setAttribute("download", `entradas_vehiculos_${new Date().toISOString().split("T")[0]}.txt`)
    link.style.visibility = "hidden"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    toast({
      title: "Exportación exitosa",
      description: `${entries.length} entradas exportadas a TXT`,
    })
  }

  const exportToWord = () => {
    if (entries.length === 0) {
      toast({
        title: "Sin datos",
        description: "No hay entradas para exportar",
        variant: "destructive",
      })
      return
    }

    // Crear contenido HTML para Word con mejor formato
    const wordContent = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" 
            xmlns:w="urn:schemas-microsoft-com:office:word" 
            xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta charset="UTF-8">
        <!--[if gte mso 9]>
        <xml>
          <w:WordDocument>
            <w:View>Print</w:View>
            <w:Zoom>100</w:Zoom>
            <w:DoNotOptimizeForBrowser/>
          </w:WordDocument>
        </xml>
        <![endif]-->
        <style>
          @page WordSection1 {
            size: 842pt 595pt; /* A4 landscape */
            margin: 56.7pt 56.7pt 56.7pt 56.7pt;
            mso-header-margin: 35.4pt;
            mso-footer-margin: 35.4pt;
            mso-paper-source:0;
            layout-grid:15.6pt;
          }
          div.WordSection1 {
            page: WordSection1;
          }
          body { 
            font-family: Arial, sans-serif; 
            margin: 0;
            padding: 0;
          }
          .container {
            width: 100%;
            display: flex;
            flex-direction: column;
            align-items: center;
          }
          h1 { 
            color: #1e40af; 
            text-align: center;
            margin-bottom: 16px;
          }
          .subtitle {
            text-align: center;
            margin-bottom: 24px;
            color: #666;
          }
          table {
            border-collapse: collapse;
            width: 100%;
            table-layout: fixed;
            word-wrap: break-word;
          }
          th, td { 
            border: 1px solid #000; 
            padding: 8px; 
            text-align: left; 
            font-size: 10pt;
          }
          th { 
            background-color: #e5e7eb; 
            font-weight: bold;
          }
          /* Ajustar ancho de columnas específicas */
          th:nth-child(1), td:nth-child(1) { width: 5%; } /* ID */
          th:nth-child(2), td:nth-child(2) { width: 8%; } /* Nombre */
          th:nth-child(3), td:nth-child(3) { width: 10%; } /* Apellidos */
          th:nth-child(4), td:nth-child(4) { width: 8%; } /* CI */
          th:nth-child(5), td:nth-child(5) { width: 10%; } /* Tipo Vehículo */
          th:nth-child(6), td:nth-child(6) { width: 10%; } /* Fecha Entrada */
          th:nth-child(7), td:nth-child(7) { width: 15%; } /* Lugar Destino */
          th:nth-child(8), td:nth-child(8) { width: 10%; } /* Fecha Salida */
          th:nth-child(9), td:nth-child(9) { width: 12%; } /* Fecha Creación */
        </style>
      </head>
      <body>
        <div class="WordSection1">
          <div class="container">
            <h1>Registro de Entradas de Vehículos</h1>
            <p class="subtitle">Fecha de exportación: ${new Date().toLocaleDateString()}</p>
            
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Nombre</th>
                  <th>Apellidos</th>
                  <th>CI</th>
                  <th>Tipo Vehículo</th>                 
                  <th>Fecha Entrada</th>
                  <th>Lugar Destino</th>
                  <th>Fecha Salida</th>
                  <th>Fecha Creación</th>
                </tr>
              </thead>
              <tbody>
                ${entries.map(entry => `
                  <tr>
                    <td>${entry.id}</td>
                    <td>${entry.nombre}</td>
                    <td>${entry.apellidos}</td>
                    <td>${entry.ci}</td>
                    <td>${entry.tipoVehiculo.join("; ")}</td>                   
                    <td>${entry.fechaEntrada}</td>
                    <td>${Object.entries(entry.lugarDestino)
                      .map(([lugar, sublugares]) => `${lugar}: ${sublugares.join(", ")}`)
                      .join("; ")}</td>
                    <td>${entry.fechaSalida || ""}</td>
                    <td>${entry.createdAt}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </body>
      </html>
    `

    const blob = new Blob([wordContent], { type: "application/msword" })
    const link = document.createElement("a")
    const url = URL.createObjectURL(blob)
    link.setAttribute("href", url)
    link.setAttribute("download", `entradas_vehiculos_${new Date().toISOString().split("T")[0]}.doc`)
    link.style.visibility = "hidden"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    toast({
      title: "Exportación exitosa",
      description: `${entries.length} entradas exportadas a Word`,
    })
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          <Download className="h-4 w-4 mr-2" />
          Exportar
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={exportToExcel}>
          <FileSpreadsheet className="mr-2 h-4 w-4" />
          Exportar a Excel
        </DropdownMenuItem>
        <DropdownMenuItem onClick={exportToCSV}>
          <FileSpreadsheet className="mr-2 h-4 w-4" />
          Exportar a CSV
        </DropdownMenuItem>
        <DropdownMenuItem onClick={exportToTXT}>
          <FileText className="mr-2 h-4 w-4" />
          Exportar a TXT
        </DropdownMenuItem>
        <DropdownMenuItem onClick={exportToWord}>
          <FileType className="mr-2 h-4 w-4" />
          Exportar a Word
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}