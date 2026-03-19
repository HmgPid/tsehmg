'use client';

import { useState, useRef } from 'react';
import styles from './Checklist.module.css';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

const MEASUREMENT_ROWS = [
  { label: "Resistência do condutor de proteção", limit: "<= 0,200 Ω", limitColor: "#555" },
  { label: "Resistência de isolação", limit: ">= 2 MΩ", limitColor: "#555" },
  { label: "Corrente de fuga para terra", limit: "<= 500 µA", limitColor: "#555" },
  { label: "Corrente de fuga para terra (Única falta)", limit: "<= 1000 µA", limitColor: "#555" },
  { label: "Corrente de fuga para carcaça", limit: "<= 100 µA", limitColor: "#555" },
  { label: "Corrente de fuga para carcaça (Única falta)", limit: "<= 500 µA", limitColor: "#555" },
  { label: "Corrente de fuga AC para paciente", limit: "<= 10 µA", limitColor: "#555" },
  { label: "Corrente de fuga AC para paciente (Única falta)", limit: "<= 50 µA", limitColor: "#555" },
  { label: "Corrente DC para paciente", limit: "<= 10 µA", limitColor: "#555" },
  { label: "Corrente DC para paciente (Única falta)", limit: "<= 50 µA", limitColor: "#555" },
  { label: "Corrente p/ paciente c/ rede nas partes aplicadas", limit: "<= 50 µA", limitColor: "#555" },
  { label: "Corrente AC auxiliar de paciente", limit: "<= 10 µA", limitColor: "#555" },
  { label: "Corrente AC auxiliar de paciente (Única falta)", limit: "<= 50 µA", limitColor: "#555" },
  { label: "Corrente DC auxiliar de paciente", limit: "<= 10 µA", limitColor: "#555" },
  { label: "Corrente DC auxiliar de paciente (Única falta)", limit: "<= 50 µA", limitColor: "#555" },
];

export default function Home() {
  const [measurements, setMeasurements] = useState<{ [key: number]: string }>({});

  const contentRef = useRef<HTMLDivElement>(null);

  const handleDownloadPdf = async () => {
    if (!contentRef.current) return;

    await document.fonts.ready;

    const canvas = await html2canvas(contentRef.current, {
      scale: 3,
      useCORS: true,
      backgroundColor: '#FFFFFF',
      scrollY: 0,
      
      onclone: (clonedDoc) => {
        const inputs = clonedDoc.querySelectorAll('input, textarea, select');
        
        inputs.forEach((input) => {
          const el = input as HTMLElement;
          const styles = window.getComputedStyle(el);
          
          const div = clonedDoc.createElement('div');
          
          let value = '';
          
          if (el.tagName === 'INPUT') {
             const inputEl = el as HTMLInputElement;
             value = inputEl.value;
             
             if (inputEl.type === 'date' && value) {
                const parts = value.split('-'); 
                if (parts.length === 3) {
                    value = `${parts[2]}/${parts[1]}/${parts[0]}`;
                }
             }
          } 
          else if (el.tagName === 'TEXTAREA') {
             value = (el as HTMLTextAreaElement).value;
          }
          else if (el.tagName === 'SELECT') {
             value = (el as HTMLSelectElement).value;
          }

          div.innerText = value;
          
          div.style.width = '100%'; 
          div.style.fontSize = styles.fontSize;
          div.style.fontWeight = styles.fontWeight;
          div.style.color = styles.color;
          div.style.fontFamily = styles.fontFamily;
          div.style.border = 'none';
          div.style.borderBottom = styles.borderBottom;
          div.style.padding = styles.padding;
          div.style.minHeight = styles.height;
          div.style.display = 'flex';

          if (el.tagName === 'TEXTAREA') {
             div.style.alignItems = 'flex-start'; 
             div.style.justifyContent = 'flex-start';
             div.style.textAlign = 'left';
             div.style.whiteSpace = 'pre-wrap'; 
          } else {
             div.style.alignItems = 'center'; 
             
             if (styles.textAlign === 'center') div.style.justifyContent = 'center';
             else if (styles.textAlign === 'right') div.style.justifyContent = 'flex-end';
             else div.style.justifyContent = 'flex-start';
             
             div.style.textAlign = styles.textAlign;
          }

          el.parentNode?.replaceChild(div, el);
        });

        const footer = clonedDoc.querySelector(`.${styles.footer}`) as HTMLElement;
        const sigContainer = clonedDoc.querySelector(`.${styles.sigContainer}`) as HTMLElement;

        if (footer) footer.style.justifyContent = 'center';

        if (sigContainer) {
            sigContainer.style.width = '100%';
            sigContainer.style.display = 'flex';
            sigContainer.style.justifyContent = 'center';
            sigContainer.style.gap = '50px'; 
        }

        const pageElement = clonedDoc.querySelector(`.${styles.page}`) as HTMLElement;
        if (pageElement) {
            pageElement.style.margin = '0';
            pageElement.style.padding = '10mm';
            pageElement.style.height = 'auto';
            pageElement.style.boxShadow = 'none';
        }
      }
    });

    const imgData = canvas.toDataURL('image/jpeg', 1.0);
    
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    const imgWidth = canvas.width;
    const imgHeight = canvas.height;
    const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
    const finalWidth = imgWidth * ratio;
    const finalHeight = imgHeight * ratio;
    const imgX = (pdfWidth - finalWidth) / 2;
    const imgY = 0;

    pdf.addImage(imgData, 'JPEG', imgX, imgY, finalWidth, finalHeight);
    pdf.save('relatorio_seguranca_eletrica.pdf');
  };

  const handleMeasurementChange = (index: number, value: string) => {
    let cleanValue = value.replace(/[^0-9.,]/g, '');

    const firstSeparator = cleanValue.search(/[.,]/);
    if (firstSeparator !== -1) {
      const before = cleanValue.substring(0, firstSeparator + 1); 
      const after = cleanValue.substring(firstSeparator + 1).replace(/[.,]/g, ''); 
      cleanValue = before + after;
    }

    setMeasurements(prev => ({ ...prev, [index]: cleanValue }));
  };

  const calculateResult = (measuredValue: string | undefined, limitString: string) => {
    if (!measuredValue) return "-";
    const measured = parseFloat(measuredValue.replace(',', '.'));
    if (isNaN(measured)) return "-";

    const parts = limitString.split(' ');
    const operator = parts[0];
    const limitNum = parseFloat(parts[1].replace(',', '.'));
    if (isNaN(limitNum)) return "-";

    if (operator === '<=') return measured <= limitNum ? "OK" : "FALHA";
    if (operator === '>=') return measured >= limitNum ? "OK" : "FALHA";
    return "-";
  };

  const getResultStyle = (result: string) => {
    if (result === 'OK') return { color: '#0056b3', fontWeight: 'bold', textAlign: 'center' as const };
    if (result === 'FALHA') return { color: 'red', fontWeight: 'bold', textAlign: 'center' as const };
    return { textAlign: 'center' as const };
  };

  const conclusion = MEASUREMENT_ROWS.some((row, index) => {
    const result = calculateResult(measurements[index], row.limit);
    return result === 'FALHA';
  }) ? 'REPROVADO' : 'APROVADO';

  return (
    <div className={styles.container}>
      <div className={styles.page} ref={contentRef}>

        <header className={styles.header}>
          <img
            src="/logo.png"
            alt="Logo Martagão"
            className={styles.logo}
          />
          <h1 className={styles.title}>Engenharia Clínica - Teste de Segurança Elétrica</h1>
        </header>

        <div className={styles.sectionTitle}>Informativo do Analisador de Segurança Elétrica</div>
        <div className={styles.infoGrid}>
          <div className={styles.field}><label>MODELO DO ANALISADOR:</label><input type="text" defaultValue="Fluke ESA612" /></div>
          <div className={styles.field}><label>Nº SÉRIE ANALISADOR:</label><input type="text" defaultValue="3964834" /></div>
          <div className={styles.field}><label>NORMA TÉCNICA:</label><input type="text" defaultValue="IEC 60601.1" /></div>
          <div className={styles.field}><label>REGISTRO DE CALIBRAÇÃO:</label><input type="text" /></div>
          <div className={styles.field}><label>DATA DA CALIBRAÇÃO:</label><input type="date" className={styles.dateInput} /></div>
          <div className={styles.field}><label>VALIDADE CALIBRAÇÃO:</label><input type="date" className={styles.dateInput} /></div>
        </div>

        <div className={styles.sectionTitle}>Identificação do Equipamento Inspecionado</div>
        <div className={styles.infoGrid}>
          <div className={styles.field}><label>MODELO - FABRICANTE:</label><input type="text" /></div>
          <div className={styles.field}><label>Nº DE SÉRIE / PATRIMÔNIO:</label><input type="text" /></div>
          <div className={styles.field}><label>SETOR / LOCALIZAÇÃO:</label><input type="text" /></div>
          <div className={styles.field}><label>TÉCNICO EXECUTOR:</label><input type="text" /></div>
          <div className={styles.field}><label>DATA DO TESTE:</label><input type="date" className={styles.dateInput} /></div>
          <div className={styles.field}><label>RASTREABILIDADE (OS):</label><input type="text" /></div>
        </div>

        <div className={styles.sectionTitle}>Inspeção Visual</div>
        <table className={styles.table} style={{ fontSize: '9px' }}>
          <tbody>
            <tr>
              <th className={styles.checkCell}>ST</th><th>ITEM</th>
              <th className={styles.checkCell}>ST</th><th>ITEM</th>
              <th className={styles.checkCell}>ST</th><th>ITEM</th>
            </tr>
            <tr>
              <td className={styles.checkCell}><input type="text" defaultValue="OK" /></td><td>Condutor de proteção</td>
              <td className={styles.checkCell}><input type="text" defaultValue="OK" /></td><td>Carcaça e partes mecânicas</td>
              <td className={styles.checkCell}><input type="text" defaultValue="OK" /></td><td>Partes isoladas</td>
            </tr>
            <tr>
              <td className={styles.checkCell}><input type="text" defaultValue="OK" /></td><td>Conectores/Tomadas</td>
              <td className={styles.checkCell}><input type="text" defaultValue="OK" /></td><td>Marcações e Etiquetas</td>
              <td className={styles.checkCell}><input type="text" defaultValue="OK" /></td><td>Outros</td>
            </tr>
          </tbody>
        </table>

        <div className={styles.sectionTitle}>Medições de Segurança Elétrica</div>
        <table className={styles.table}>
          <thead>
            <tr>
              <th style={{ width: '45%' }}>PARÂMETRO / TESTE</th>
              <th style={{ width: '20%', textAlign: 'center' }}>VALOR MEDIDO</th>
              <th style={{ width: '20%', textAlign: 'center' }}>VALOR LIMITE</th>
              <th style={{ width: '15%', textAlign: 'center' }}>RESULTADO</th>
            </tr>
          </thead>
          <tbody>
            {MEASUREMENT_ROWS.map((row, index) => {
              const resultValue = calculateResult(measurements[index], row.limit);
              const unit = row.limit.split(' ').pop(); 
              const hasValue = measurements[index] && measurements[index].length > 0;

              return (
                <tr key={index}>
                  <td>{row.label}</td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                        <input
                          type="text"
                          value={measurements[index] || ''}
                          onChange={(e) => handleMeasurementChange(index, e.target.value)}
                          inputMode="decimal"
                          style={{ textAlign: 'right', width: '60%', paddingRight: '5px' }}
                          placeholder="0,000"
                        />
                        <span style={{ fontSize: '10px', color: '#555', fontWeight: 'bold', width: '40%', textAlign: 'left' }}>
                            {hasValue ? unit : ''}
                        </span>
                    </div>
                  </td>
                  <td style={{ textAlign: 'center', color: row.limitColor }}>{row.limit}</td>
                  <td>
                    <input
                      type="text"
                      value={resultValue}
                      readOnly
                      style={getResultStyle(resultValue)}
                    />
                  </td>
                </tr>
              );
            })}
            
            <tr style={{ 
                backgroundColor: 'var(--primary-blue)',
            }}>
              <td style={{ color: 'white', fontWeight: 'bold' }}>CONCLUSÃO DOS TESTES</td>
              <td colSpan={3}>
                <input
                  type="text"
                  value={conclusion}
                  readOnly
                  style={{ 
                      color: conclusion === 'REPROVADO' ? '#ff5555' : 'white', 
                      fontWeight: 'bold', 
                      textAlign: 'center',
                      backgroundColor: 'transparent',
                      cursor: 'default'
                  }}
                />
              </td>
            </tr>
          </tbody>
        </table>

        <div className={styles.obsContainer}>
          <div className={styles.sectionTitle} style={{ marginTop: 0 }}>OBSERVAÇÕES ADICIONAIS</div>
          <textarea placeholder="Digite aqui as observações do teste..."></textarea>
        </div>

        <footer className={styles.footer}>
          <button
            className={styles.printBtn}
            onClick={handleDownloadPdf}
            data-html2canvas-ignore="true"
          >
            BAIXAR RELATÓRIO
          </button>

          <div className={styles.sigContainer}>
            <div className={styles.sigBox}>
              <div className={styles.sigLine}></div>
              <span>Assinatura do Técnico Executor</span>
            </div>
            <div className={styles.sigBox}>
              <div className={styles.sigLine}></div>
              <span>Assinatura do Supervisor Técnico</span>
            </div>
          </div>
        </footer>

      </div>
    </div>
  );
}