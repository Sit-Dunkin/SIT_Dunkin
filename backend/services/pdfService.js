import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import PdfPrinter from 'pdfmake';

// 1. CONFIGURACIÓN DE FUENTES PDFMAKE
const fonts = {
    Roboto: {
        normal: 'Helvetica',
        bold: 'Helvetica-Bold',
        italics: 'Helvetica-Oblique',
        bolditalics: 'Helvetica-BoldOblique'
    }
};
const printer = new PdfPrinter(fonts);

// Helper para promesas
export const crearPDF = (fnGenerar, datos, equipos) => {
    return new Promise((resolve, reject) => {
        try {
            fnGenerar(datos, equipos, (buffer) => {
                resolve(buffer);
            });
        } catch (err) {
            reject(err);
        }
    });
};

// ==========================================
// 1. ACTA DE SALIDA (DISEÑO DUNKIN FINAL - ORDEN Nº X)
// ==========================================
// ==========================================
// 1. ACTA DE SALIDA (CORREGIDA: CONTROL DE PAGINACIÓN Y FIRMAS)
// ==========================================
export const generarActaSalida = (datos, equipos, callback) => {
    // Document Configuration
    const doc = new PDFDocument({ margin: 50, size: 'LETTER' }); 
    const buffers = [];

    // Buffer handling for download
    doc.on('data', buffers.push.bind(buffers));
    doc.on('end', () => {
        const pdfData = Buffer.concat(buffers);
        callback(pdfData);
    });

    // --- STYLE VARIABLES ---
    const colorDunkinOrange = '#F37021'; 
    const colorBlack = '#000000';
    const fontBold = 'Helvetica-Bold';
    const fontRegular = 'Helvetica';
    const startY = 40;
    const pageWidth = 595; // Standard letter width
    const pageHeight = 792; // Standard letter height
    const margin = 50;

    // --- HELPER FUNCTION: DRAW HEADER ---
    const drawHeader = () => {
        // 1. LOGO
        try {
            const logoPath = path.join(process.cwd(), 'assets', 'Logo_Dunkin.png');
            if (fs.existsSync(logoPath)) {
                doc.image(logoPath, margin, startY, { width: 100 });
            } else {
                doc.fontSize(20).fillColor(colorDunkinOrange).font(fontBold).text("DUNKIN'", margin, startY + 10);
            }
        } catch (e) {
            doc.fontSize(20).fillColor(colorDunkinOrange).font(fontBold).text("DUNKIN'", margin, startY + 10);
        }

        // 2. CONTROL TABLE (Top Right)
        const tableW = 140;
        const tableX = pageWidth - margin - tableW;
        const tableY = startY;

        doc.fillColor(colorBlack);
        
        // Row 1: Code
        doc.fontSize(8).font(fontBold).text('Código:', tableX, tableY);
        doc.font(fontRegular).text('TI-FSA-01', tableX + 40, tableY);

        // Row 2: Version
        doc.font(fontBold).text('Versión:', tableX, tableY + 12);
        doc.font(fontRegular).text('2', tableX + 40, tableY + 12);

        // Row 3: Format Validity Date
        doc.font(fontBold).text('Fecha:', tableX, tableY + 24);
        doc.font(fontRegular).text('14/02/2025', tableX + 40, tableY + 24); 

        // Separator Line
        doc.moveTo(margin, startY + 55).lineTo(pageWidth - margin, startY + 55).lineWidth(1).strokeColor('#000000').stroke();
    };

    // --- HELPER FUNCTION: DRAW TABLE HEADERS ---
    // Column X positions for: Type, Asset, Serial, Destination, Brand, Model
    const colX = {
        tipo: margin,             // Type
        activo: margin + 90,      // Asset
        serial: margin + 150,     // Serial
        destino: margin + 230,    // Destination (Wider)
        marca: margin + 350,      // Brand
        modelo: margin + 430      // Model
    };

    const drawTableHeaders = (y) => {
        const headerHeight = 20;
        doc.lineWidth(1).strokeColor(colorBlack);
        
        // Top and bottom lines of header
        doc.moveTo(margin, y).lineTo(pageWidth - margin, y).stroke();
        doc.moveTo(margin, y + headerHeight).lineTo(pageWidth - margin, y + headerHeight).stroke();
        
        // Text
        doc.fontSize(8).font(fontBold).fillColor(colorBlack);
        doc.text('TIPO', colX.tipo + 2, y + 6);
        doc.text('ACTIVO', colX.activo + 2, y + 6);
        doc.text('SERIAL', colX.serial + 2, y + 6);
        doc.text('DESTINO', colX.destino + 2, y + 6);
        doc.text('MARCA', colX.marca + 2, y + 6);
        doc.text('MODELO', colX.modelo + 2, y + 6);

        // Vertical lines for header
        drawVerticals(y, y + headerHeight);
        
        return y + headerHeight;
    };

    const drawVerticals = (yStart, yEnd) => {
        doc.lineWidth(0.5).strokeColor(colorBlack);
        doc.moveTo(colX.tipo, yStart).lineTo(colX.tipo, yEnd).stroke();
        doc.moveTo(colX.activo, yStart).lineTo(colX.activo, yEnd).stroke();
        doc.moveTo(colX.serial, yStart).lineTo(colX.serial, yEnd).stroke();
        doc.moveTo(colX.destino, yStart).lineTo(colX.destino, yEnd).stroke();
        doc.moveTo(colX.marca, yStart).lineTo(colX.marca, yEnd).stroke();
        doc.moveTo(colX.modelo, yStart).lineTo(colX.modelo, yEnd).stroke();
        doc.moveTo(pageWidth - margin, yStart).lineTo(pageWidth - margin, yEnd).stroke();
    };

    // ---------------------------------------------------------
    // START DRAWING
    // ---------------------------------------------------------
    
    // Draw initial header
    drawHeader();
    doc.moveDown(4);

    // --- B. TITLE AND CITY ---
    const numeroOrden = datos.numeroOrden || 'S/N'; 
    doc.fontSize(14).font(fontBold).text(`ORDEN DE SALIDA Nº ${numeroOrden}`, 0, doc.y, { align: 'center', width: pageWidth });
    doc.moveDown(1);

    const fechaActual = new Date(datos.fecha).toLocaleDateString('es-CO', { timeZone: 'America/Bogota', year: 'numeric', month: '2-digit', day: '2-digit' });
    doc.fontSize(10).font(fontRegular).text(`Medellín, ${fechaActual}`, margin, doc.y, { align: 'right', width: pageWidth - (margin * 2) });
    doc.moveDown(2);

    // --- C. TRANSFER DATA ---
    const leftCol = margin;
    let currentY = doc.y;
    const lineHeight = 15;
    const labelWidth = 80;

    // From:
    doc.font(fontBold).text('De:', leftCol, currentY);
    doc.font(fontRegular).text('SISTEMAS DONUTS DE ANTIOQUIA S.A', leftCol + labelWidth, currentY);
    
    // To:
    currentY += lineHeight;
    doc.font(fontBold).text('Para:', leftCol, currentY);
    doc.font(fontRegular).text('OPERACIÓN', leftCol + labelWidth, currentY);

    // Phone:
    currentY += lineHeight;
    doc.font(fontBold).text('Teléfono:', leftCol, currentY);
    doc.font(fontRegular).text('N/A', leftCol + labelWidth, currentY);

    // Responsible:
    currentY += lineHeight;
    doc.font(fontBold).text('Responsable:', leftCol, currentY);
    doc.font(fontRegular).text((datos.responsable || 'SISTEMAS').toUpperCase(), leftCol + labelWidth, currentY);

    doc.moveDown(2);
    doc.text('Por medio de la presente se autoriza el traslado de los siguientes equipos:', margin, doc.y);
    doc.moveDown(1);

    // --- D. EQUIPMENT TABLE ---
    let tableY = doc.y;
    
    // Draw initial table headers
    tableY = drawTableHeaders(tableY);

    doc.font(fontRegular).fontSize(8);

    equipos.forEach(eq => {
        const rowHeight = 25; // Fixed height for simplicity, adjust if needed

        // PAGE BREAK CONTROL
        if (tableY + rowHeight > pageHeight - margin - 100) { // -100 for space for signatures
            doc.addPage();
            drawHeader(); // Re-draw top header
            doc.moveDown(4); // Space after header
            tableY = doc.y + 20; // Start table lower
            tableY = drawTableHeaders(tableY); // Re-draw table headers
            doc.font(fontRegular).fontSize(8);
        }

        // Cell Data preparation
        const tipo = (eq.tipo_equipo || '').substring(0, 20);
        const activo = (eq.placa_inventario || 'S/P').substring(0, 15);
        const serial = (eq.serial || 'S/N').substring(0, 20);
        // Use individual destination if available, otherwise global destination
        const destino = (eq.destino || datos.destinoNombre || 'N/A').toUpperCase().substring(0, 25);
        const marca = (eq.marca || '').substring(0, 15);
        const modelo = (eq.modelo || '').substring(0, 15);

        // Draw Text
        doc.text(tipo, colX.tipo + 2, tableY + 8, { width: 85, align: 'left' });
        doc.text(activo, colX.activo + 2, tableY + 8, { width: 55, align: 'center' });
        doc.text(serial, colX.serial + 2, tableY + 8, { width: 75, align: 'left' });
        doc.text(destino, colX.destino + 2, tableY + 8, { width: 115, align: 'left' }); // Wider column for destination
        doc.text(marca, colX.marca + 2, tableY + 8, { width: 75, align: 'left' });
        doc.text(modelo, colX.modelo + 2, tableY + 8, { width: 60, align: 'left' });

        // Draw Row Lines
        doc.moveTo(margin, tableY + rowHeight).lineTo(pageWidth - margin, tableY + rowHeight).stroke();
        drawVerticals(tableY, tableY + rowHeight);

        tableY += rowHeight;
    });

    // Update Y position after table
    doc.y = tableY + 15;
    
    // --- E. CLOSING TEXT AND SIGNATURES ---
    
    // Ensure space for signatures
    if (doc.y + 150 > pageHeight - margin) {
        doc.addPage();
        drawHeader();
        doc.y = margin + 100;
    }

    doc.font(fontRegular).text('Se envían los siguientes elementos en buenas condiciones.', margin, doc.y);
    doc.text('Cordialmente,', margin, doc.y + 15);

    const firmasY = doc.y + 50; 

    // --- Left Column: AUTORIZA ---
    doc.font(fontBold).text('Autoriza', margin, firmasY);
    
    doc.font(fontBold).text('Nombre:', margin, firmasY + 30);
    doc.moveTo(margin + 45, firmasY + 40).lineTo(margin + 230, firmasY + 40).stroke(); 
    doc.font(fontRegular).text((datos.responsable || '').toUpperCase(), margin + 50, firmasY + 28, { width: 180 }); 

    doc.font(fontBold).text('Cédula:', margin, firmasY + 60);
    doc.moveTo(margin + 45, firmasY + 70).lineTo(margin + 230, firmasY + 70).stroke();

    // --- Right Column: RECIBIDO POR ---
    const colRightX = 320;
    doc.font(fontBold).text('Recibido por', colRightX, firmasY);
    
    doc.font(fontBold).text('Nombre:', colRightX, firmasY + 30);
    doc.moveTo(colRightX + 45, firmasY + 40).lineTo(colRightX + 230, firmasY + 40).stroke(); 
    
    doc.font(fontBold).text('Cédula:', colRightX, firmasY + 60);
    doc.moveTo(colRightX + 45, firmasY + 70).lineTo(colRightX + 230, firmasY + 70).stroke();

    doc.end();
};
// ==========================================
// 2. ACTA DE RETORNO (PDFKIT) - OBS ABAJO
// ==========================================


// ==========================================
// 3. ACTA DE RETORNO (CORREGIDA: CON COLUMNA ACTIVO)
// ==========================================
export const generarActaRetorno = (datos, equipos, callback) => {
    // Configuración del documento
    const doc = new PDFDocument({ margin: 50, size: 'LETTER' }); 
    const buffers = [];

    doc.on('data', buffers.push.bind(buffers));
    doc.on('end', () => {
        const pdfData = Buffer.concat(buffers);
        callback(pdfData);
    });

    // --- VARIABLES DE ESTILO ---
    const colorDunkinOrange = '#F37021'; 
    const colorBlack = '#000000';
    const fontBold = 'Helvetica-Bold';
    const fontRegular = 'Helvetica';
    const startY = 40;
    const pageWidth = 595;
    const margin = 50;

    // ---------------------------------------------------------
    // A. ENCABEZADO
    // ---------------------------------------------------------
    try {
        const logoPath = path.join(process.cwd(), 'assets', 'Logo_Dunkin.png');
        if (fs.existsSync(logoPath)) {
            doc.image(logoPath, margin, startY, { width: 100 });
        } else {
            doc.fontSize(20).fillColor(colorDunkinOrange).font(fontBold).text("DUNKIN'", margin, startY + 10);
        }
    } catch (e) {
        doc.fontSize(20).fillColor(colorDunkinOrange).font(fontBold).text("DUNKIN'", margin, startY + 10);
    }

    const tableW = 140;
    const tableX = pageWidth - margin - tableW;
    const tableY = startY;

    doc.fillColor(colorBlack);
    doc.fontSize(8).font(fontBold).text('Código:', tableX, tableY);
    doc.font(fontRegular).text('TI-FRA-01', tableX + 40, tableY);
    doc.font(fontBold).text('Versión:', tableX, tableY + 12);
    doc.font(fontRegular).text('2', tableX + 40, tableY + 12);
    doc.font(fontBold).text('Fecha:', tableX, tableY + 24);
    doc.font(fontRegular).text('14/02/2025', tableX + 40, tableY + 24); 

    doc.moveTo(margin, startY + 55).lineTo(pageWidth - margin, startY + 55).lineWidth(1).strokeColor('#000000').stroke();
    doc.moveDown(4);

    // ---------------------------------------------------------
    // B. TÍTULO
    // ---------------------------------------------------------
    const numeroOrden = datos.numeroOrden || 'S/N'; 
    doc.fontSize(14).font(fontBold).text(`ACTA DE RETORNO Nº ${numeroOrden}`, 0, doc.y, { align: 'center', width: pageWidth });
    doc.moveDown(1);

    const fechaActual = new Date().toLocaleDateString('es-CO', { timeZone: 'America/Bogota', year: 'numeric', month: '2-digit', day: '2-digit' });
    doc.fontSize(10).font(fontRegular).text(`Medellín, ${fechaActual}`, margin, doc.y, { align: 'right', width: pageWidth - (margin * 2) });
    doc.moveDown(2);

    // ---------------------------------------------------------
    // C. DATOS
    // ---------------------------------------------------------
    const leftCol = margin;
    let currentY = doc.y;
    const lineHeight = 15;
    const labelWidth = 80;

    doc.font(fontBold).text('De (Origen):', leftCol, currentY);
    doc.font(fontRegular).text((datos.origen || 'PUNTO DE VENTA').toUpperCase(), leftCol + labelWidth, currentY);
    
    currentY += lineHeight;
    doc.font(fontBold).text('Para:', leftCol, currentY);
    doc.font(fontRegular).text('DEPARTAMENTO DE TECNOLOGÍA (SISTEMAS)', leftCol + labelWidth, currentY);

    currentY += lineHeight;
    doc.font(fontBold).text('Recibido por:', leftCol, currentY);
    doc.font(fontRegular).text((datos.responsable || 'SISTEMAS').toUpperCase(), leftCol + labelWidth, currentY);

    doc.moveDown(2);
    doc.text('Por medio de la presente se certifica el retorno de los siguientes equipos a las oficinas de sistemas:', margin, doc.y);
    doc.moveDown(1);

    // ---------------------------------------------------------
    // D. TABLA DE EQUIPOS (CON COLUMNA ACTIVO)
    // ---------------------------------------------------------
    const tableTop = doc.y;
    
    // 🔥 AJUSTE DE COLUMNAS PARA INCLUIR "ACTIVO"
    const colX = {
        nombre: margin,             
        origen: margin + 90,       
        serial: margin + 160,
        activo: margin + 230,  // <--- NUEVA COLUMNA AQUÍ
        modelo: margin + 290,       
        motivo: margin + 390        
    };

    const drawVerticals = (yStart, yEnd) => {
        doc.lineWidth(0.5).strokeColor(colorBlack);
        doc.moveTo(colX.nombre, yStart).lineTo(colX.nombre, yEnd).stroke();
        doc.moveTo(colX.origen, yStart).lineTo(colX.origen, yEnd).stroke();
        doc.moveTo(colX.serial, yStart).lineTo(colX.serial, yEnd).stroke();
        doc.moveTo(colX.activo, yStart).lineTo(colX.activo, yEnd).stroke(); // Línea Activo
        doc.moveTo(colX.modelo, yStart).lineTo(colX.modelo, yEnd).stroke();
        doc.moveTo(colX.motivo, yStart).lineTo(colX.motivo, yEnd).stroke();
        doc.moveTo(pageWidth - margin, yStart).lineTo(pageWidth - margin, yEnd).stroke();
    };

    // --- Encabezados ---
    const headerHeight = 20;
    doc.moveTo(margin, tableTop).lineTo(pageWidth - margin, tableTop).stroke();
    doc.moveTo(margin, tableTop + headerHeight).lineTo(pageWidth - margin, tableTop + headerHeight).stroke();
    
    doc.fontSize(9).font(fontBold);
    doc.text('Nombre', colX.nombre + 3, tableTop + 6);
    doc.text('Origen', colX.origen + 3, tableTop + 6);
    doc.text('Serial', colX.serial + 3, tableTop + 6);
    doc.text('Activo', colX.activo + 3, tableTop + 6); // Texto Activo
    doc.text('Modelo', colX.modelo + 3, tableTop + 6);
    doc.text('Motivo/Est.', colX.motivo + 3, tableTop + 6);

    drawVerticals(tableTop, tableTop + headerHeight);

    // --- Filas ---
    let y = tableTop + headerHeight;
    doc.font(fontRegular).fontSize(8); // Letra un poco más pequeña para que quepa todo

    equipos.forEach(eq => {
        const rowHeight = 25; 
        
        doc.text((eq.tipo_equipo || '').substring(0, 18), colX.nombre + 3, y + 8, { width: 85 });
        doc.text((datos.origen || '').substring(0, 12), colX.origen + 3, y + 8, { width: 65 });
        doc.text((eq.serial || '').substring(0, 15), colX.serial + 3, y + 8, { width: 65 });
        doc.text((eq.placa_inventario || 'S/P'), colX.activo + 3, y + 8, { width: 55 }); // Dato Activo
        doc.text((eq.modelo || '').substring(0, 18), colX.modelo + 3, y + 8, { width: 95 });
        doc.text((datos.motivo || eq.estado || 'Retorno').substring(0, 25), colX.motivo + 3, y + 8, { width: 95 });

        doc.moveTo(margin, y + rowHeight).lineTo(pageWidth - margin, y + rowHeight).stroke();
        drawVerticals(y, y + rowHeight);

        y += rowHeight;
    });

    doc.y = y + 15;
    
    // ---------------------------------------------------------
    // E. CIERRE Y FIRMAS
    // ---------------------------------------------------------
    if (datos.observaciones) {
        doc.font(fontBold).fontSize(10).text('Observaciones:', margin, doc.y);
        doc.font(fontRegular).text(datos.observaciones, margin, doc.y + 5);
        doc.moveDown(2);
    }

    doc.text('Cordialmente,', margin, doc.y);
    const firmasY = doc.y + 60;

    // Izquierda
    doc.font(fontBold).text('Entregado por (Punto/Origen)', margin, firmasY);
    doc.font(fontBold).text('Nombre:', margin, firmasY + 30);
    doc.moveTo(margin + 45, firmasY + 40).lineTo(margin + 230, firmasY + 40).stroke(); 
    doc.font(fontRegular).text((datos.quien_entrega || '').toUpperCase(), margin + 50, firmasY + 28, { width: 180 });
    doc.font(fontBold).text('Cédula:', margin, firmasY + 60);
    doc.moveTo(margin + 45, firmasY + 70).lineTo(margin + 230, firmasY + 70).stroke();

    // Derecha
    const colRightX = 320;
    doc.font(fontBold).text('Recibido por (Sistemas)', colRightX, firmasY);
    doc.font(fontBold).text('Nombre:', colRightX, firmasY + 30);
    doc.moveTo(colRightX + 45, firmasY + 40).lineTo(colRightX + 230, firmasY + 40).stroke(); 
    doc.font(fontRegular).text((datos.responsable || '').toUpperCase(), colRightX + 50, firmasY + 28, { width: 180 });
    doc.font(fontBold).text('Cédula:', colRightX, firmasY + 60);
    doc.moveTo(colRightX + 45, firmasY + 70).lineTo(colRightX + 230, firmasY + 70).stroke();

    doc.end();
};


// 4. ORDEN DE REPARACIÓN (DISEÑO DUNKIN FINAL)
// ==========================================
export const generarActaReparacion = (datos, equipos, callback) => {
    const doc = new PDFDocument({ margin: 50, size: 'LETTER' }); 
    const buffers = [];

    doc.on('data', buffers.push.bind(buffers));
    doc.on('end', () => {
        const pdfData = Buffer.concat(buffers);
        callback(pdfData);
    });

    // --- VARIABLES DE ESTILO ---
    const colorDunkinOrange = '#F37021'; 
    const colorBlack = '#000000';
    const fontBold = 'Helvetica-Bold';
    const fontRegular = 'Helvetica';
    const startY = 40;
    const pageWidth = 595;
    const margin = 50;

    // ---------------------------------------------------------
    // A. ENCABEZADO
    // ---------------------------------------------------------
    try {
        const logoPath = path.join(process.cwd(), 'assets', 'Logo_Dunkin.png');
        if (fs.existsSync(logoPath)) {
            doc.image(logoPath, margin, startY, { width: 100 });
        } else {
            doc.fontSize(20).fillColor(colorDunkinOrange).font(fontBold).text("DUNKIN'", margin, startY + 10);
        }
    } catch (e) {
        doc.fontSize(20).fillColor(colorDunkinOrange).font(fontBold).text("DUNKIN'", margin, startY + 10);
    }

    // Tabla de Control (TI-FMR-01: Formato Mantenimiento Reparación)
    const tableW = 140;
    const tableX = pageWidth - margin - tableW;
    const tableY = startY;

    doc.fillColor(colorBlack);
    doc.fontSize(8).font(fontBold).text('Código:', tableX, tableY);
    doc.font(fontRegular).text('TI-FMR-01', tableX + 40, tableY);
    doc.font(fontBold).text('Versión:', tableX, tableY + 12);
    doc.font(fontRegular).text('2', tableX + 40, tableY + 12);
    doc.font(fontBold).text('Fecha:', tableX, tableY + 24);
    doc.font(fontRegular).text('14/02/2025', tableX + 40, tableY + 24); 

    doc.moveTo(margin, startY + 55).lineTo(pageWidth - margin, startY + 55).lineWidth(1).strokeColor('#000000').stroke();
    doc.moveDown(4);

    // ---------------------------------------------------------
    // B. TÍTULO
    // ---------------------------------------------------------
    const numeroOrden = datos.numeroOrden || 'S/N'; 
    doc.fontSize(14).font(fontBold).text(`ORDEN DE SERVICIO TÉCNICO Nº ${numeroOrden}`, 0, doc.y, { align: 'center', width: pageWidth });
    doc.moveDown(1);

    const fechaActual = new Date().toLocaleDateString('es-CO', { timeZone: 'America/Bogota', year: 'numeric', month: '2-digit', day: '2-digit' });
    doc.fontSize(10).font(fontRegular).text(`Medellín, ${fechaActual}`, margin, doc.y, { align: 'right', width: pageWidth - (margin * 2) });
    doc.moveDown(2);

    // ---------------------------------------------------------
    // C. DATOS DEL PROVEEDOR / TÉCNICO
    // ---------------------------------------------------------
    const leftCol = margin;
    let currentY = doc.y;
    const lineHeight = 15;
    const labelWidth = 90;

    doc.font(fontBold).text('Empresa / Taller:', leftCol, currentY);
    doc.font(fontRegular).text((datos.empresa || '').toUpperCase(), leftCol + labelWidth, currentY);
    
    currentY += lineHeight;
    doc.font(fontBold).text('Técnico Asignado:', leftCol, currentY);
    doc.font(fontRegular).text((datos.tecnico_nombre || 'POR ASIGNAR').toUpperCase(), leftCol + labelWidth, currentY);

    currentY += lineHeight;
    doc.font(fontBold).text('Identificación:', leftCol, currentY);
    doc.font(fontRegular).text(datos.tecnico_id || 'N/A', leftCol + labelWidth, currentY);

    currentY += lineHeight;
    doc.font(fontBold).text('Teléfono:', leftCol, currentY);
    doc.font(fontRegular).text(datos.tecnico_telefono || 'N/A', leftCol + labelWidth, currentY);

    // Responsable Dunkin (Quien solicita el servicio)
    currentY += lineHeight;
    doc.font(fontBold).text('Solicitado por:', leftCol, currentY);
    doc.font(fontRegular).text((datos.responsable || 'SISTEMAS DUNKIN').toUpperCase(), leftCol + labelWidth, currentY);

    doc.moveDown(2);
    doc.text('Por medio de la presente se hace entrega de los siguientes equipos para revisión y/o reparación:', margin, doc.y);
    doc.moveDown(1);

    // ---------------------------------------------------------
    // D. TABLA DE EQUIPOS (REJILLA CON ACTIVO)
    // ---------------------------------------------------------
    const tableTop = doc.y;
    
    const colX = {
        tipo: margin,             
        marca: margin + 100,       
        serial: margin + 180,
        activo: margin + 260,
        falla: margin + 330        
    };

    const drawVerticals = (yStart, yEnd) => {
        doc.lineWidth(0.5).strokeColor(colorBlack);
        doc.moveTo(colX.tipo, yStart).lineTo(colX.tipo, yEnd).stroke();
        doc.moveTo(colX.marca, yStart).lineTo(colX.marca, yEnd).stroke();
        doc.moveTo(colX.serial, yStart).lineTo(colX.serial, yEnd).stroke();
        doc.moveTo(colX.activo, yStart).lineTo(colX.activo, yEnd).stroke();
        doc.moveTo(colX.falla, yStart).lineTo(colX.falla, yEnd).stroke();
        doc.moveTo(pageWidth - margin, yStart).lineTo(pageWidth - margin, yEnd).stroke();
    };

    // Encabezados
    const headerHeight = 20;
    doc.moveTo(margin, tableTop).lineTo(pageWidth - margin, tableTop).stroke();
    doc.moveTo(margin, tableTop + headerHeight).lineTo(pageWidth - margin, tableTop + headerHeight).stroke();
    
    doc.fontSize(9).font(fontBold);
    doc.text('Tipo', colX.tipo + 3, tableTop + 6);
    doc.text('Marca/Modelo', colX.marca + 3, tableTop + 6);
    doc.text('Serial', colX.serial + 3, tableTop + 6);
    doc.text('Activo', colX.activo + 3, tableTop + 6);
    doc.text('Falla / Obs', colX.falla + 3, tableTop + 6);

    drawVerticals(tableTop, tableTop + headerHeight);

    // Filas
    let y = tableTop + headerHeight;
    doc.font(fontRegular).fontSize(8);

    equipos.forEach(eq => {
        const rowHeight = 25; 
        const marcaModelo = `${eq.marca || ''} ${eq.modelo || ''}`.trim().substring(0, 20);
        const falla = datos.observaciones || 'Revisión General / Diagnóstico';
        
        doc.text((eq.tipo_equipo || '').substring(0, 20), colX.tipo + 3, y + 8, { width: 95 });
        doc.text(marcaModelo, colX.marca + 3, y + 8, { width: 75 });
        doc.text((eq.serial || '').substring(0, 15), colX.serial + 3, y + 8, { width: 75 });
        doc.text((eq.placa_inventario || 'S/P'), colX.activo + 3, y + 8, { width: 65 });
        doc.text(falla.substring(0, 45), colX.falla + 3, y + 8, { width: 200 });

        doc.moveTo(margin, y + rowHeight).lineTo(pageWidth - margin, y + rowHeight).stroke();
        drawVerticals(y, y + rowHeight);

        y += rowHeight;
    });

    doc.y = y + 20;
    
    // ---------------------------------------------------------
    // E. CIERRE Y FIRMAS
    // ---------------------------------------------------------
    doc.text('Se solicita diagnóstico y cotización formal antes de proceder con reparaciones mayores.', margin, doc.y);
    doc.text('Cordialmente,', margin, doc.y + 15);

    const firmasY = doc.y + 60;

    // Izquierda: AUTORIZA (Sistemas)
    doc.font(fontBold).text('Autoriza Salida (Sistemas)', margin, firmasY);
    doc.font(fontBold).text('Nombre:', margin, firmasY + 30);
    doc.moveTo(margin + 45, firmasY + 40).lineTo(margin + 230, firmasY + 40).stroke(); 
    doc.font(fontRegular).text((datos.responsable || '').toUpperCase(), margin + 50, firmasY + 28, { width: 180 });
    doc.font(fontBold).text('Cédula:', margin, firmasY + 60);
    doc.moveTo(margin + 45, firmasY + 70).lineTo(margin + 230, firmasY + 70).stroke();

    // Derecha: RECIBE (Técnico)
    const colRightX = 320;
    doc.font(fontBold).text('Recibe (Servicio Técnico)', colRightX, firmasY);
    doc.font(fontBold).text('Nombre:', colRightX, firmasY + 30);
    doc.moveTo(colRightX + 45, firmasY + 40).lineTo(colRightX + 230, firmasY + 40).stroke(); 
    
    // Si tenemos el nombre del técnico, lo ponemos
    if (datos.tecnico_nombre) {
        doc.font(fontRegular).text(datos.tecnico_nombre.toUpperCase(), colRightX + 50, firmasY + 28, { width: 180 });
    }
    
    doc.font(fontBold).text('Cédula/NIT:', colRightX, firmasY + 60);
    doc.moveTo(colRightX + 65, firmasY + 70).lineTo(colRightX + 230, firmasY + 70).stroke();

    doc.end();
};

// ==========================================
// 4. ACTA DE BAJA (PDFKIT) - ESTILO UNIFICADO
// ==========================================
// ==========================================
// 5. ACTA DE BAJA TÉCNICA (DISEÑO DUNKIN FINAL)
// ==========================================
export const generarActaBaja = (datos, equipos, callback) => {
    const doc = new PDFDocument({ margin: 50, size: 'LETTER' }); 
    const buffers = [];

    doc.on('data', buffers.push.bind(buffers));
    doc.on('end', () => {
        const pdfData = Buffer.concat(buffers);
        callback(pdfData);
    });

    // --- VARIABLES DE ESTILO ---
    const colorDunkinOrange = '#F37021'; 
    const colorBlack = '#000000';
    const fontBold = 'Helvetica-Bold';
    const fontRegular = 'Helvetica';
    const startY = 40;
    const pageWidth = 595;
    const margin = 50;

    // ---------------------------------------------------------
    // A. ENCABEZADO
    // ---------------------------------------------------------
    try {
        const logoPath = path.join(process.cwd(), 'assets', 'Logo_Dunkin.png');
        if (fs.existsSync(logoPath)) {
            doc.image(logoPath, margin, startY, { width: 100 });
        } else {
            doc.fontSize(20).fillColor(colorDunkinOrange).font(fontBold).text("DUNKIN'", margin, startY + 10);
        }
    } catch (e) {
        doc.fontSize(20).fillColor(colorDunkinOrange).font(fontBold).text("DUNKIN'", margin, startY + 10);
    }

    // Tabla de Control (TI-FBA-01: Formato Baja Activos)
    const tableW = 140;
    const tableX = pageWidth - margin - tableW;
    const tableY = startY;

    doc.fillColor(colorBlack);
    doc.fontSize(8).font(fontBold).text('Código:', tableX, tableY);
    doc.font(fontRegular).text('TI-FBA-01', tableX + 40, tableY);
    doc.font(fontBold).text('Versión:', tableX, tableY + 12);
    doc.font(fontRegular).text('2', tableX + 40, tableY + 12);
    doc.font(fontBold).text('Fecha:', tableX, tableY + 24);
    doc.font(fontRegular).text('14/02/2025', tableX + 40, tableY + 24); 

    doc.moveTo(margin, startY + 55).lineTo(pageWidth - margin, startY + 55).lineWidth(1).strokeColor('#000000').stroke();
    doc.moveDown(4);

    // ---------------------------------------------------------
    // B. TÍTULO
    // ---------------------------------------------------------
    const numeroOrden = datos.numeroOrden || 'S/N'; 
    doc.fontSize(14).font(fontBold).text(`ACTA DE BAJA TÉCNICA Nº ${numeroOrden}`, 0, doc.y, { align: 'center', width: pageWidth });
    doc.moveDown(1);

    const fechaActual = new Date().toLocaleDateString('es-CO', { timeZone: 'America/Bogota', year: 'numeric', month: '2-digit', day: '2-digit' });
    doc.fontSize(10).font(fontRegular).text(`Medellín, ${fechaActual}`, margin, doc.y, { align: 'right', width: pageWidth - (margin * 2) });
    doc.moveDown(2);

    // ---------------------------------------------------------
    // C. DATOS GENERALES
    // ---------------------------------------------------------
    const leftCol = margin;
    let currentY = doc.y;
    const lineHeight = 15;
    const labelWidth = 100;

    doc.font(fontBold).text('Concepto Técnico:', leftCol, currentY);
    doc.font(fontRegular).text('BAJA POR OBSOLESCENCIA / DAÑO IRREPARABLE', leftCol + labelWidth, currentY);
    
    currentY += lineHeight;
    doc.font(fontBold).text('Destino Final:', leftCol, currentY);
    doc.font(fontRegular).text((datos.destino_final || 'DISPOSICIÓN FINAL / RAEE').toUpperCase(), leftCol + labelWidth, currentY);

    currentY += lineHeight;
    doc.font(fontBold).text('Solicitado por:', leftCol, currentY);
    doc.font(fontRegular).text('DEPARTAMENTO DE TECNOLOGÍA', leftCol + labelWidth, currentY);

    currentY += lineHeight;
    doc.font(fontBold).text('Autorizado por:', leftCol, currentY);
    doc.font(fontRegular).text((datos.autoriza || 'GERENCIA / AUDITORÍA').toUpperCase(), leftCol + labelWidth, currentY);

    doc.moveDown(2);
    doc.text('Se certifica que los siguientes activos fijos han sido evaluados y se recomienda su baja definitiva del inventario:', margin, doc.y);
    doc.moveDown(1);

    // ---------------------------------------------------------
    // D. TABLA DE EQUIPOS
    // ---------------------------------------------------------
    const tableTop = doc.y;
    
    const colX = {
        tipo: margin,             
        marca: margin + 100,       
        serial: margin + 180,
        activo: margin + 260,
        motivo: margin + 330        
    };

    const drawVerticals = (yStart, yEnd) => {
        doc.lineWidth(0.5).strokeColor(colorBlack);
        doc.moveTo(colX.tipo, yStart).lineTo(colX.tipo, yEnd).stroke();
        doc.moveTo(colX.marca, yStart).lineTo(colX.marca, yEnd).stroke();
        doc.moveTo(colX.serial, yStart).lineTo(colX.serial, yEnd).stroke();
        doc.moveTo(colX.activo, yStart).lineTo(colX.activo, yEnd).stroke();
        doc.moveTo(colX.motivo, yStart).lineTo(colX.motivo, yEnd).stroke();
        doc.moveTo(pageWidth - margin, yStart).lineTo(pageWidth - margin, yEnd).stroke();
    };

    // Encabezados
    const headerHeight = 20;
    doc.moveTo(margin, tableTop).lineTo(pageWidth - margin, tableTop).stroke();
    doc.moveTo(margin, tableTop + headerHeight).lineTo(pageWidth - margin, tableTop + headerHeight).stroke();
    
    doc.fontSize(9).font(fontBold);
    doc.text('Elemento', colX.tipo + 3, tableTop + 6);
    doc.text('Marca/Modelo', colX.marca + 3, tableTop + 6);
    doc.text('Serial', colX.serial + 3, tableTop + 6);
    doc.text('Activo', colX.activo + 3, tableTop + 6);
    doc.text('Diagnóstico / Motivo', colX.motivo + 3, tableTop + 6);

    drawVerticals(tableTop, tableTop + headerHeight);

    // Filas
    let y = tableTop + headerHeight;
    doc.font(fontRegular).fontSize(8);

    equipos.forEach(eq => {
        const rowHeight = 25; 
        const marcaModelo = `${eq.marca || ''} ${eq.modelo || ''}`.trim().substring(0, 20);
        const motivo = datos.observaciones || 'Equipo obsoleto / Dañado';
        
        doc.text((eq.tipo_equipo || '').substring(0, 20), colX.tipo + 3, y + 8, { width: 95 });
        doc.text(marcaModelo, colX.marca + 3, y + 8, { width: 75 });
        doc.text((eq.serial || '').substring(0, 15), colX.serial + 3, y + 8, { width: 75 });
        doc.text((eq.placa_inventario || 'S/P'), colX.activo + 3, y + 8, { width: 65 });
        doc.text(motivo.substring(0, 45), colX.motivo + 3, y + 8, { width: 200 });

        doc.moveTo(margin, y + rowHeight).lineTo(pageWidth - margin, y + rowHeight).stroke();
        drawVerticals(y, y + rowHeight);

        y += rowHeight;
    });

    doc.y = y + 20;
    
    // ---------------------------------------------------------
    // E. CIERRE Y FIRMAS
    // ---------------------------------------------------------
    doc.font(fontBold).text('Declaración:', margin, doc.y);
    doc.font(fontRegular).text('Los elementos aquí descritos quedan dados de baja del sistema de información y pasan a proceso de disposición final (Chatarra electrónica / Donación / Destrucción).', margin, doc.y + 5);
    doc.moveDown(2);

    const firmasY = doc.y + 60;

    // Izquierda: CONCEPTO TÉCNICO
    doc.font(fontBold).text('Concepto Técnico (Sistemas)', margin, firmasY);
    doc.font(fontBold).text('Nombre:', margin, firmasY + 30);
    doc.moveTo(margin + 45, firmasY + 40).lineTo(margin + 230, firmasY + 40).stroke(); 
    // Usuario que hizo el proceso
    doc.font(fontRegular).text((datos.responsable || '').toUpperCase(), margin + 50, firmasY + 28, { width: 180 });
    doc.font(fontBold).text('Firma:', margin, firmasY + 60);
    doc.moveTo(margin + 45, firmasY + 70).lineTo(margin + 230, firmasY + 70).stroke();

    // Derecha: VISTO BUENO (Gerencia / Auditoría)
    const colRightX = 320;
    doc.font(fontBold).text('Visto Bueno (Gerencia/Auditoría)', colRightX, firmasY);
    doc.font(fontBold).text('Nombre:', colRightX, firmasY + 30);
    doc.moveTo(colRightX + 45, firmasY + 40).lineTo(colRightX + 230, firmasY + 40).stroke(); 
    
    // Autoriza (Jefe o Gerente)
    if (datos.autoriza) {
        doc.font(fontRegular).text(datos.autoriza.toUpperCase(), colRightX + 50, firmasY + 28, { width: 180 });
    }
    
    doc.font(fontBold).text('Firma:', colRightX, firmasY + 60);
    doc.moveTo(colRightX + 45, firmasY + 70).lineTo(colRightX + 230, firmasY + 70).stroke();

    doc.end();
};
/// ==========================================
// 5. ACTA DE RESIDUOS (RAEE) - ESTILO UNIFICADO
// ==========================================
// ==========================================
// 6. MANIFIESTO DE RESIDUOS RAEE (CORREGIDO)
// ==========================================
// ==========================================
// 6. MANIFIESTO DE RESIDUOS RAEE (CORREGIDO)
// ==========================================
export const generarActaResiduos = (datos, equipos, callback) => {
    // Configuración del documento
    const doc = new PDFDocument({ margin: 50, size: 'LETTER' }); 
    const buffers = [];

    doc.on('data', buffers.push.bind(buffers));
    doc.on('end', () => {
        const pdfData = Buffer.concat(buffers);
        callback(pdfData);
    });

    // --- VARIABLES DE ESTILO ---
    const colorDunkinOrange = '#F37021'; 
    const colorBlack = '#000000';
    const fontBold = 'Helvetica-Bold';
    const fontRegular = 'Helvetica';
    const startY = 40;
    const pageWidth = 595;
    const margin = 50;

    // A. ENCABEZADO
    try {
        const logoPath = path.join(process.cwd(), 'assets', 'Logo_Dunkin.png');
        if (fs.existsSync(logoPath)) {
            doc.image(logoPath, margin, startY, { width: 100 });
        } else {
            doc.fontSize(20).fillColor(colorDunkinOrange).font(fontBold).text("DUNKIN'", margin, startY + 10);
        }
    } catch (e) {
        doc.fontSize(20).fillColor(colorDunkinOrange).font(fontBold).text("DUNKIN'", margin, startY + 10);
    }

    const tableW = 140;
    const tableX = pageWidth - margin - tableW;
    const tableY = startY;

    doc.fillColor(colorBlack);
    doc.fontSize(8).font(fontBold).text('Código:', tableX, tableY);
    doc.font(fontRegular).text('TI-FGR-01', tableX + 40, tableY);
    doc.font(fontBold).text('Versión:', tableX, tableY + 12);
    doc.font(fontRegular).text('2', tableX + 40, tableY + 12);
    doc.font(fontBold).text('Fecha:', tableX, tableY + 24);
    doc.font(fontRegular).text('14/02/2025', tableX + 40, tableY + 24); 

    doc.moveTo(margin, startY + 55).lineTo(pageWidth - margin, startY + 55).lineWidth(1).strokeColor('#000000').stroke();
    doc.moveDown(4);

    // B. TÍTULO
    const numeroOrden = datos.numeroOrden || 'S/N'; 
    doc.fontSize(14).font(fontBold).text(`MANIFIESTO ENTREGA RESIDUOS RAEE Nº ${numeroOrden}`, 0, doc.y, { align: 'center', width: pageWidth });
    doc.moveDown(1);

    const fechaActual = new Date().toLocaleDateString('es-CO', { timeZone: 'America/Bogota', year: 'numeric', month: '2-digit', day: '2-digit' });
    doc.fontSize(10).font(fontRegular).text(`Medellín, ${fechaActual}`, margin, doc.y, { align: 'right', width: pageWidth - (margin * 2) });
    doc.moveDown(2);

    // C. DATOS GENERALES
    const leftCol = margin;
    let currentY = doc.y;
    const lineHeight = 15;
    const labelWidth = 110;

    doc.font(fontBold).text('Empresa Gestora:', leftCol, currentY);
    doc.font(fontRegular).text((datos.empresa_reciclaje || 'GESTOR AUTORIZADO').toUpperCase(), leftCol + labelWidth, currentY);
    
    currentY += lineHeight;
    doc.font(fontBold).text('Conductor / Recibe:', leftCol, currentY);
    doc.font(fontRegular).text((datos.conductor || '').toUpperCase(), leftCol + labelWidth, currentY);

    currentY += lineHeight;
    doc.font(fontBold).text('Placa Vehículo:', leftCol, currentY);
    doc.font(fontRegular).text((datos.placa_vehiculo || 'N/A').toUpperCase(), leftCol + labelWidth, currentY);

    currentY += lineHeight;
    doc.font(fontBold).text('Entregado por:', leftCol, currentY);
    doc.font(fontRegular).text('DONUTS ANTIOQUIA S.A', leftCol + labelWidth, currentY);

    doc.moveDown(2);
    doc.text('Se hace entrega de los siguientes Residuos de Aparatos Eléctricos y Electrónicos (RAEE) para su correcta disposición final:', margin, doc.y);
    doc.moveDown(1);

    // D. TABLA
    const tableTop = doc.y;
    const colX = {
        tipo: margin,             
        marca: margin + 100,       
        serial: margin + 180,
        activo: margin + 260,
        obs: margin + 330        
    };

    const drawVerticals = (yStart, yEnd) => {
        doc.lineWidth(0.5).strokeColor(colorBlack);
        doc.moveTo(colX.tipo, yStart).lineTo(colX.tipo, yEnd).stroke();
        doc.moveTo(colX.marca, yStart).lineTo(colX.marca, yEnd).stroke();
        doc.moveTo(colX.serial, yStart).lineTo(colX.serial, yEnd).stroke();
        doc.moveTo(colX.activo, yStart).lineTo(colX.activo, yEnd).stroke();
        doc.moveTo(colX.obs, yStart).lineTo(colX.obs, yEnd).stroke();
        doc.moveTo(pageWidth - margin, yStart).lineTo(pageWidth - margin, yEnd).stroke();
    };

    const headerHeight = 20;
    doc.moveTo(margin, tableTop).lineTo(pageWidth - margin, tableTop).stroke();
    doc.moveTo(margin, tableTop + headerHeight).lineTo(pageWidth - margin, tableTop + headerHeight).stroke();
    
    doc.fontSize(9).font(fontBold);
    doc.text('Clasificación', colX.tipo + 3, tableTop + 6);
    doc.text('Marca', colX.marca + 3, tableTop + 6);
    doc.text('Serial', colX.serial + 3, tableTop + 6);
    doc.text('Activo', colX.activo + 3, tableTop + 6);
    doc.text('Observaciones / Estado', colX.obs + 3, tableTop + 6);

    drawVerticals(tableTop, tableTop + headerHeight);

    // --- FILAS (CORREGIDO AQUÍ EL SUBSTRING) ---
    let y = tableTop + headerHeight;
    doc.font(fontRegular).fontSize(8);

    equipos.forEach(eq => {
        const rowHeight = 25; 
        
        // 🔥 CORRECCIÓN: Aumentamos el límite de caracteres a 30
        doc.text((eq.tipo_equipo || '').substring(0, 30), colX.tipo + 3, y + 8, { width: 95 });
        
        doc.text((eq.marca || '').substring(0, 15), colX.marca + 3, y + 8, { width: 75 });
        doc.text((eq.serial || '').substring(0, 15), colX.serial + 3, y + 8, { width: 75 });
        doc.text((eq.placa_inventario || 'S/P'), colX.activo + 3, y + 8, { width: 65 });
        doc.text((datos.observaciones || 'Chatarra Electrónica').substring(0, 45), colX.obs + 3, y + 8, { width: 200 });

        doc.moveTo(margin, y + rowHeight).lineTo(pageWidth - margin, y + rowHeight).stroke();
        drawVerticals(y, y + rowHeight);
        y += rowHeight;
    });

    doc.y = y + 20;
    
    // E. FIRMAS
    doc.font(fontBold).text('Declaración de Responsabilidad:', margin, doc.y);
    doc.font(fontRegular).text('La empresa gestora certifica que recibe estos residuos para darles el tratamiento ambiental adecuado según la normativa vigente.', margin, doc.y + 5);
    doc.moveDown(2);

    const firmasY = doc.y + 60;

    // Izquierda: DUNKIN
    doc.font(fontBold).text('Entregado por (Dunkin)', margin, firmasY);
    doc.font(fontBold).text('Nombre:', margin, firmasY + 30);
    doc.moveTo(margin + 45, firmasY + 40).lineTo(margin + 230, firmasY + 40).stroke(); 
    doc.font(fontRegular).text((datos.responsable || 'SISTEMAS').toUpperCase(), margin + 50, firmasY + 28, { width: 180 });
    doc.font(fontBold).text('Firma:', margin, firmasY + 60);
    doc.moveTo(margin + 45, firmasY + 70).lineTo(margin + 230, firmasY + 70).stroke();

    // Derecha: GESTOR
    const colRightX = 320;
    doc.font(fontBold).text('Recibido por (Gestor Ambiental)', colRightX, firmasY);
    doc.font(fontBold).text('Nombre:', colRightX, firmasY + 30);
    doc.moveTo(colRightX + 45, firmasY + 40).lineTo(colRightX + 230, firmasY + 40).stroke(); 
    if (datos.conductor) {
        doc.font(fontRegular).text(datos.conductor.toUpperCase(), colRightX + 50, firmasY + 28, { width: 180 });
    }
    doc.font(fontBold).text('Cédula:', colRightX, firmasY + 60);
    doc.moveTo(colRightX + 45, firmasY + 70).lineTo(colRightX + 230, firmasY + 70).stroke();

    doc.end();
};
// ==========================================
// 6. ACTA DE INGRESO (MANUAL)
// ==========================================
export const generarActaIngreso = (datos, equipo, callback) => {
    const doc = new PDFDocument({ margin: 50, size: 'LETTER' }); 
    const buffers = [];

    doc.on('data', buffers.push.bind(buffers));
    doc.on('end', () => {
        const pdfData = Buffer.concat(buffers);
        callback(pdfData);
    });

    // --- VARIABLES DE ESTILO ---
    const colorDunkinOrange = '#F37021'; 
    const colorBlack = '#000000';
    const fontBold = 'Helvetica-Bold';
    const fontRegular = 'Helvetica';
    const startY = 40;
    const pageWidth = 595;
    const margin = 50;

    // ---------------------------------------------------------
    // A. ENCABEZADO
    // ---------------------------------------------------------
    try {
        const logoPath = path.join(process.cwd(), 'assets', 'Logo_Dunkin.png');
        if (fs.existsSync(logoPath)) {
            doc.image(logoPath, margin, startY, { width: 100 });
        } else {
            doc.fontSize(20).fillColor(colorDunkinOrange).font(fontBold).text("DUNKIN'", margin, startY + 10);
        }
    } catch (e) {
        doc.fontSize(20).fillColor(colorDunkinOrange).font(fontBold).text("DUNKIN'", margin, startY + 10);
    }

    // Tabla de Control (TI-FAI-01)
    const tableW = 140;
    const tableX = pageWidth - margin - tableW;
    const tableY = startY;

    doc.fillColor(colorBlack);
    doc.fontSize(8).font(fontBold).text('Código:', tableX, tableY);
    doc.font(fontRegular).text('TI-FAI-01', tableX + 40, tableY);
    doc.font(fontBold).text('Versión:', tableX, tableY + 12);
    doc.font(fontRegular).text('2', tableX + 40, tableY + 12);
    doc.font(fontBold).text('Fecha:', tableX, tableY + 24);
    doc.font(fontRegular).text('14/02/2025', tableX + 40, tableY + 24); 

    doc.moveTo(margin, startY + 55).lineTo(pageWidth - margin, startY + 55).lineWidth(1).strokeColor('#000000').stroke();
    doc.moveDown(4);

    // ---------------------------------------------------------
    // B. TÍTULO
    // ---------------------------------------------------------
    const numeroOrden = datos.numeroOrden || 'S/N'; 
    doc.fontSize(14).font(fontBold).text(`ACTA DE INGRESO DE ACTIVOS Nº ${numeroOrden}`, 0, doc.y, { align: 'center', width: pageWidth });
    doc.moveDown(1);

    const fechaActual = new Date().toLocaleDateString('es-CO', { timeZone: 'America/Bogota', year: 'numeric', month: '2-digit', day: '2-digit' });
    doc.fontSize(10).font(fontRegular).text(`Medellín, ${fechaActual}`, margin, doc.y, { align: 'right', width: pageWidth - (margin * 2) });
    doc.moveDown(2);

    // ---------------------------------------------------------
    // C. DATOS GENERALES
    // ---------------------------------------------------------
    const leftCol = margin;
    let currentY = doc.y;
    const lineHeight = 15;
    const labelWidth = 100;

    doc.font(fontBold).text('Proveedor / Origen:', leftCol, currentY);
    doc.font(fontRegular).text((datos.origen_acta || 'COMPRA DIRECTA').toUpperCase(), leftCol + labelWidth, currentY);
    
    currentY += lineHeight;
    doc.font(fontBold).text('Recibido por:', leftCol, currentY);
    doc.font(fontRegular).text((datos.recibe_acta || 'SISTEMAS').toUpperCase(), leftCol + labelWidth, currentY);

    if (datos.cargo_acta) {
        currentY += lineHeight;
        doc.font(fontBold).text('Cargo:', leftCol, currentY);
        doc.font(fontRegular).text(datos.cargo_acta.toUpperCase(), leftCol + labelWidth, currentY);
    }

    doc.moveDown(2);
    doc.text('Por medio de la presente se certifica el ingreso al inventario de tecnología de los siguientes elementos:', margin, doc.y);
    doc.moveDown(1);

    // ---------------------------------------------------------
    // D. TABLA DE EQUIPO (REJILLA)
    // ---------------------------------------------------------
    const tableTop = doc.y;
    
    const colX = {
        tipo: margin,             
        marca: margin + 100,       
        serial: margin + 180,
        activo: margin + 260,
        modelo: margin + 330,
        estado: margin + 410
    };

    const drawVerticals = (yStart, yEnd) => {
        doc.lineWidth(0.5).strokeColor(colorBlack);
        doc.moveTo(colX.tipo, yStart).lineTo(colX.tipo, yEnd).stroke();
        doc.moveTo(colX.marca, yStart).lineTo(colX.marca, yEnd).stroke();
        doc.moveTo(colX.serial, yStart).lineTo(colX.serial, yEnd).stroke();
        doc.moveTo(colX.activo, yStart).lineTo(colX.activo, yEnd).stroke();
        doc.moveTo(colX.modelo, yStart).lineTo(colX.modelo, yEnd).stroke();
        doc.moveTo(colX.estado, yStart).lineTo(colX.estado, yEnd).stroke();
        doc.moveTo(pageWidth - margin, yStart).lineTo(pageWidth - margin, yEnd).stroke();
    };

    // Encabezados
    const headerHeight = 20;
    doc.moveTo(margin, tableTop).lineTo(pageWidth - margin, tableTop).stroke();
    doc.moveTo(margin, tableTop + headerHeight).lineTo(pageWidth - margin, tableTop + headerHeight).stroke();
    
    doc.fontSize(9).font(fontBold);
    doc.text('Elemento', colX.tipo + 3, tableTop + 6);
    doc.text('Marca', colX.marca + 3, tableTop + 6);
    doc.text('Serial', colX.serial + 3, tableTop + 6);
    doc.text('Activo', colX.activo + 3, tableTop + 6);
    doc.text('Modelo', colX.modelo + 3, tableTop + 6);
    doc.text('Estado', colX.estado + 3, tableTop + 6);

    drawVerticals(tableTop, tableTop + headerHeight);

    // Filas
    let y = tableTop + headerHeight;
    doc.font(fontRegular).fontSize(8);

    // Aseguramos que sea un array
    const lista = Array.isArray(equipo) ? equipo : [equipo];

    lista.forEach(eq => {
        const rowHeight = 25; 
        
        // 🔥 CORRECCIÓN: Substring ampliado a 30 caracteres para que quepa "Computador Escritorio"
        doc.text((eq.tipo_equipo || '').substring(0, 30), colX.tipo + 3, y + 8, { width: 95 });
        
        doc.text((eq.marca || '').substring(0, 15), colX.marca + 3, y + 8, { width: 75 });
        doc.text((eq.serial || '').substring(0, 15), colX.serial + 3, y + 8, { width: 75 });
        doc.text((eq.placa_inventario || 'S/P'), colX.activo + 3, y + 8, { width: 65 });
        doc.text((eq.modelo || '').substring(0, 15), colX.modelo + 3, y + 8, { width: 75 });
        doc.text((eq.estado || 'NUEVO').substring(0, 20), colX.estado + 3, y + 8, { width: 80 });

        doc.moveTo(margin, y + rowHeight).lineTo(pageWidth - margin, y + rowHeight).stroke();
        drawVerticals(y, y + rowHeight);

        y += rowHeight;
    });

    doc.y = y + 20;
    
    // ---------------------------------------------------------
    // E. OBSERVACIONES Y FIRMAS
    // ---------------------------------------------------------
    if (datos.observaciones) {
        doc.font(fontBold).text('Observaciones:', margin, doc.y);
        doc.font(fontRegular).text(datos.observaciones, margin, doc.y + 5);
        doc.moveDown(2);
    }

    doc.text('Los equipos ingresan al inventario y quedan bajo custodia del departamento de Sistemas hasta su asignación final.', margin, doc.y);
    doc.moveDown(2);

    const firmasY = doc.y + 40;

    // Izquierda: PROVEEDOR / ORIGEN
    doc.font(fontBold).text('Entregado por (Proveedor/Origen)', margin, firmasY);
    doc.font(fontBold).text('Nombre:', margin, firmasY + 30);
    doc.moveTo(margin + 45, firmasY + 40).lineTo(margin + 230, firmasY + 40).stroke(); 
    doc.font(fontRegular).text('_______________________', margin + 50, firmasY + 28); // Espacio para firmar

    doc.font(fontBold).text('Empresa:', margin, firmasY + 60);
    doc.moveTo(margin + 45, firmasY + 70).lineTo(margin + 230, firmasY + 70).stroke();
    doc.font(fontRegular).text((datos.origen_acta || '').toUpperCase(), margin + 50, firmasY + 58, { width: 180 });

    // Derecha: RECIBE (SISTEMAS)
    const colRightX = 320;
    doc.font(fontBold).text('Recibido por (Sistemas)', colRightX, firmasY);
    doc.font(fontBold).text('Nombre:', colRightX, firmasY + 30);
    doc.moveTo(colRightX + 45, firmasY + 40).lineTo(colRightX + 230, firmasY + 40).stroke(); 
    doc.font(fontRegular).text((datos.recibe_acta || '').toUpperCase(), colRightX + 50, firmasY + 28, { width: 180 });

    doc.font(fontBold).text('Fecha:', colRightX, firmasY + 60);
    doc.moveTo(colRightX + 45, firmasY + 70).lineTo(colRightX + 230, firmasY + 70).stroke();
    doc.font(fontRegular).text(fechaActual, colRightX + 50, firmasY + 58);

    doc.end();
};

// ==========================================
// 7. ACTA DE INGRESO MASIVO (EXCEL)
// ==========================================
// ==========================================
// 7. REPORTE DE IMPORTACIÓN MASIVA (CON COLUMNA ORIGEN)
// ==========================================
export const generarActaIngresoMasivo = (datos, equipos, callback) => {
    const doc = new PDFDocument({ margin: 30, size: 'LETTER' }); // Margen estrecho (30) para 7 columnas
    const buffers = [];

    doc.on('data', buffers.push.bind(buffers));
    doc.on('end', () => {
        const pdfData = Buffer.concat(buffers);
        callback(pdfData);
    });

    // --- VARIABLES DE ESTILO ---
    const colorDunkinOrange = '#F37021'; 
    const colorBlack = '#000000';
    const fontBold = 'Helvetica-Bold';
    const fontRegular = 'Helvetica';
    const startY = 40;
    const pageWidth = 612; 
    const margin = 30;

    // A. ENCABEZADO
    try {
        const logoPath = path.join(process.cwd(), 'assets', 'Logo_Dunkin.png');
        if (fs.existsSync(logoPath)) {
            doc.image(logoPath, margin, startY, { width: 100 });
        } else {
            doc.fontSize(20).fillColor(colorDunkinOrange).font(fontBold).text("DUNKIN'", margin, startY + 10);
        }
    } catch (e) {
        doc.fontSize(20).fillColor(colorDunkinOrange).font(fontBold).text("DUNKIN'", margin, startY + 10);
    }

    const tableW = 140;
    const tableX = pageWidth - margin - tableW;
    const tableY = startY;

    doc.fillColor(colorBlack);
    doc.fontSize(8).font(fontBold).text('Código:', tableX, tableY);
    doc.font(fontRegular).text('TI-RIM-01', tableX + 40, tableY);
    doc.font(fontBold).text('Versión:', tableX, tableY + 12);
    doc.font(fontRegular).text('2', tableX + 40, tableY + 12);
    doc.font(fontBold).text('Fecha:', tableX, tableY + 24);
    doc.font(fontRegular).text('14/02/2025', tableX + 40, tableY + 24); 

    doc.moveTo(margin, startY + 55).lineTo(pageWidth - margin, startY + 55).lineWidth(1).strokeColor('#000000').stroke();
    doc.moveDown(4);

    // B. TÍTULO
    const numeroOrden = datos.numeroOrden || 'S/N'; 
    doc.fontSize(14).font(fontBold).text(`REPORTE DE IMPORTACIÓN MASIVA Nº ${numeroOrden}`, 0, doc.y, { align: 'center', width: pageWidth });
    doc.moveDown(1);

    const fechaActual = new Date().toLocaleDateString('es-CO', { timeZone: 'America/Bogota', year: 'numeric', month: '2-digit', day: '2-digit' });
    doc.fontSize(10).font(fontRegular).text(`Medellín, ${fechaActual}`, margin, doc.y, { align: 'right', width: pageWidth - (margin * 2) });
    doc.moveDown(2);

    // C. DATOS DEL CARGUE
    const leftCol = margin;
    let currentY = doc.y;
    const labelWidth = 100;

    doc.font(fontBold).text('Responsable Carga:', leftCol, currentY);
    doc.font(fontRegular).text((datos.responsable || 'ADMINISTRADOR').toUpperCase(), leftCol + labelWidth, currentY);
    
    currentY += 15;
    doc.font(fontBold).text('Archivo Origen:', leftCol, currentY);
    doc.font(fontRegular).text((datos.nombre_archivo || 'Carga_Excel.xlsx'), leftCol + labelWidth, currentY);

    doc.font(fontBold).text('Total Registros:', 350, currentY - 15);
    doc.font(fontRegular).text(equipos.length.toString(), 430, currentY - 15);

    doc.font(fontBold).text('Estado Carga:', 350, currentY);
    doc.font(fontRegular).text('EXITOSA', 430, currentY);

    doc.moveDown(2);
    doc.text('A continuación se detallan los activos fijos creados e ingresados al inventario:', margin, doc.y);
    doc.moveDown(1);

    // ---------------------------------------------------------
    // D. TABLA DE EQUIPOS (CON COLUMNA ORIGEN)
    // ---------------------------------------------------------
    
    // Configuración de Columnas (Ajustada para incluir ORIGEN)
    const colX = {
        item: margin,
        tipo: margin + 25,
        marca: margin + 110,
        modelo: margin + 170,
        serial: margin + 235,
        activo: margin + 305,
        origen: margin + 365, // <--- Nueva Posición
        estado: margin + 475
    };

    const drawHeader = (y) => {
        doc.fontSize(7).font(fontBold).fillColor(colorBlack);
        doc.text('#', colX.item + 2, y + 6);
        doc.text('TIPO', colX.tipo + 2, y + 6);
        doc.text('MARCA', colX.marca + 2, y + 6);
        doc.text('MODELO', colX.modelo + 2, y + 6);
        doc.text('SERIAL', colX.serial + 2, y + 6);
        doc.text('ACTIVO', colX.activo + 2, y + 6);
        doc.text('ORIGEN', colX.origen + 2, y + 6); // <--- Nuevo Encabezado
        doc.text('ESTADO', colX.estado + 2, y + 6);

        doc.moveTo(margin, y).lineTo(pageWidth - margin, y).stroke();
        doc.moveTo(margin, y + 20).lineTo(pageWidth - margin, y + 20).stroke();
        
        drawVerticals(y, y + 20);
    };

    const drawVerticals = (yStart, yEnd) => {
        doc.lineWidth(0.5).strokeColor(colorBlack);
        doc.moveTo(colX.item, yStart).lineTo(colX.item, yEnd).stroke();
        doc.moveTo(colX.tipo, yStart).lineTo(colX.tipo, yEnd).stroke();
        doc.moveTo(colX.marca, yStart).lineTo(colX.marca, yEnd).stroke();
        doc.moveTo(colX.modelo, yStart).lineTo(colX.modelo, yEnd).stroke();
        doc.moveTo(colX.serial, yStart).lineTo(colX.serial, yEnd).stroke();
        doc.moveTo(colX.activo, yStart).lineTo(colX.activo, yEnd).stroke();
        doc.moveTo(colX.origen, yStart).lineTo(colX.origen, yEnd).stroke(); // <--- Nueva línea
        doc.moveTo(colX.estado, yStart).lineTo(colX.estado, yEnd).stroke();
        doc.moveTo(pageWidth - margin, yStart).lineTo(pageWidth - margin, yEnd).stroke();
    };

    let y = doc.y;
    drawHeader(y);
    y += 20;

    doc.font(fontRegular).fontSize(7); // Texto pequeño (7) para que quepa todo

    equipos.forEach((eq, index) => {
        if (y > 720) {
            doc.addPage();
            y = 50; 
            drawHeader(y);
            y += 20;
            doc.font(fontRegular).fontSize(7);
        }

        const rowHeight = 20; 

        doc.text((index + 1).toString(), colX.item + 2, y + 6, { width: 20, align: 'center' });
        doc.text((eq.tipo_equipo || '').substring(0, 22), colX.tipo + 2, y + 6, { width: 80 });
        doc.text((eq.marca || '').substring(0, 15), colX.marca + 2, y + 6, { width: 55 });
        doc.text((eq.modelo || '').substring(0, 15), colX.modelo + 2, y + 6, { width: 60 });
        doc.text((eq.serial || '').substring(0, 18), colX.serial + 2, y + 6, { width: 65 });
        doc.text((eq.placa_inventario || 'S/P'), colX.activo + 2, y + 6, { width: 55 });
        
        // <--- DIBUJAR COLUMNA ORIGEN
        doc.text((eq.origen || 'Externo').substring(0, 25), colX.origen + 2, y + 6, { width: 105 });

        doc.text((eq.estado || 'DISPONIBLE').substring(0, 15), colX.estado + 2, y + 6, { width: 60 });

        doc.moveTo(margin, y + rowHeight).lineTo(pageWidth - margin, y + rowHeight).stroke();
        drawVerticals(y, y + rowHeight);

        y += rowHeight;
    });

    if (y > 650) { doc.addPage(); y = 50; }
    
    y += 40;
    doc.fontSize(9).font(fontBold).text('Realizado por (Sistemas):', margin, y);
    doc.moveTo(margin, y + 30).lineTo(margin + 200, y + 30).stroke();
    doc.font(fontRegular).text((datos.responsable || '').toUpperCase(), margin + 5, y + 35);

    doc.fontSize(7).fillColor('#555')
       .text("SIT - Sistema de Inventario Tecnológico Dunkin' | Reporte Automático", margin, 750, { align: 'center', width: pageWidth - (margin * 2) });

    doc.end();
};