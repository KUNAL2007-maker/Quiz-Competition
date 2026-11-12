import json
import os
import subprocess
from pathlib import Path

# Load questions
src_json = Path(r"C:\Users\Priyanka\OneDrive\Desktop\Quiz-Competition\src\constants\cyberDefenseQuestions.json")
with open(src_json, "r", encoding="utf-8") as f:
    questions = json.load(f)

explanations = [
    # Q1
    "Prepared statements ensure that the database driver strictly separates SQL query syntax from user-supplied parameters. The query template is compiled in advance, and parameter values are treated solely as literal data regardless of input characters, fully neutralizing SQL injection (SQLi).",
    # Q2
    "DNS Tunneling encodes command-and-control instructions and exfiltrated binary payloads inside DNS queries (e.g., high-entropy subdomains) and responses (TXT/NULL records). Because outbound UDP port 53 is typically unrestricted on firewalls, attackers exploit it as a covert egress channel.",
    # Q3
    "AES-256-GCM is an Authenticated Encryption with Associated Data (AEAD) cipher mode combining counter-mode confidentiality with GMAC integrity authentication in a single primitive. This prevents ciphertext tampering and eliminates padding oracle vulnerabilities inherent to legacy CBC modes.",
    # Q4
    "Public clients (mobile apps, single-page web applications) cannot securely store a static client_secret. The Proof Key for Code Exchange (PKCE) extension dynamically creates a one-time cryptographic code_verifier and code_challenge, preventing attackers from intercepting authorization codes via registered custom URI schemes.",
    # Q5
    "Certutil.exe is a legitimate, Microsoft-signed Windows binary designed for certificate management. When attackers abuse its '-urlcache -split -f' flags to download remote payloads, they are employing Living-off-the-Land Binaries (LOLBins) to blend into legitimate administrative traffic and evade binary execution blocks.",
    # Q6
    "An IAM user with iam:PassRole and ec2:RunInstances can launch a new EC2 instance attached to an existing high-privilege administrator instance profile. By accessing the Instance Metadata Service (IMDS at 169.254.169.254) from within that instance, the user can extract administrative session credentials, escalating their privileges to full administrator.",
    # Q7
    "Windows Defender Credential Guard leverages Virtualization-Based Security (VBS) and Hyper-V hypervisor controls to run the Local Security Authority Subsystem Service (LSASS) inside an isolated Virtual Secure Mode (VSM) container. Even if an attacker achieves local SYSTEM rights, they cannot dump plaintext credentials or Kerberos tickets from memory.",
    # Q8
    "The SameSite=Strict attribute instructs web browsers never to send the cookie in any cross-site request, even when following standard hyperlinks from external domains. This eliminates Cross-Site Request Forgery (CSRF) without requiring custom anti-CSRF challenge tokens for cross-site interactions.",
    # Q9
    "Standard cryptographic hash functions like MD5, SHA-1, and SHA-256 are engineered for high-speed throughput on data streams. Modern GPUs and ASICs can compute billions of SHA-256 hashes per second, making brute-force dictionary attacks trivial. Secure password storage requires memory-hard, computationally expensive functions such as Argon2id or bcrypt.",
    # Q10
    "Under NIST SP 800-61r2, the containment priority for propagating ransomware is immediate network isolation (via EDR containment or VLAN quarantine). This severs SMB lateral propagation paths across the network while keeping the machine powered on to preserve volatile RAM for digital forensics and potential decryption key recovery."
]

html_cards = []
for idx, q in enumerate(questions):
    opts_html = []
    correct_opt_id = q["correctOptionId"]
    correct_text = ""
    for opt in q["options"]:
        is_correct = opt["id"] == correct_opt_id
        if is_correct:
            correct_text = opt["text"]
            opts_html.append(f"""
            <div class="option-item correct-option">
              <span class="option-badge correct-badge">✓ Option {opt['label']} (CORRECT)</span>
              <span class="option-text"><strong>{opt['text']}</strong></span>
            </div>
            """)
        else:
            opts_html.append(f"""
            <div class="option-item">
              <span class="option-badge">Option {opt['label']}</span>
              <span class="option-text">{opt['text']}</span>
            </div>
            """)

    html_cards.append(f"""
    <div class="question-card">
      <div class="card-header">
        <div class="q-title-group">
          <span class="q-pill">QUESTION {idx + 1:02d}</span>
          <span class="category-pill">{q.get('category', 'Cybersecurity')}</span>
        </div>
        <div class="points-pill">{q.get('points', 100)} PTS · {q.get('timeLimitSeconds', 20)}s</div>
      </div>

      <div class="q-prompt">{q['prompt']}</div>

      <div class="options-container">
        {''.join(opts_html)}
      </div>

      <div class="solution-box">
        <div class="solution-header">
          <span class="verified-icon">🛡️</span>
          <strong>VERIFIED MASTER ANSWER:</strong> {correct_text}
        </div>
        <div class="solution-rationale">
          <strong>Technical Rationale:</strong> {explanations[idx]}
        </div>
      </div>
    </div>
    """)

# Master table rows
table_rows = []
for idx, q in enumerate(questions):
    correct_opt = next(o for o in q["options"] if o["id"] == q["correctOptionId"])
    table_rows.append(f"""
    <tr>
      <td style="font-weight:700; text-align:center;">Q{idx+1:02d}</td>
      <td>{q.get('category', '').split('(')[-1].replace(')', '') or q.get('category', '')}</td>
      <td style="text-align:center; font-weight:800; color:#10b981;">Option {correct_opt['label']}</td>
      <td>{correct_opt['text']}</td>
    </tr>
    """)

full_html = f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Cyber Defense Challenge 2026 - Official Master Answer Key</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@500;700&display=swap');

    @page {{
      size: A4 portrait;
      margin: 12mm 14mm 14mm 14mm;
    }}

    * {{
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }}

    body {{
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      color: #1e293b;
      background: #ffffff;
      font-size: 11pt;
      line-height: 1.5;
    }}

    .document-header {{
      border-bottom: 2px solid #0f172a;
      padding-bottom: 14px;
      margin-bottom: 20px;
    }}

    .brand-bar {{
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
    }}

    .brand-logo {{
      font-family: 'JetBrains Mono', monospace;
      font-size: 10pt;
      font-weight: 800;
      letter-spacing: 0.15em;
      color: #0f172a;
      text-transform: uppercase;
    }}

    .brand-tag {{
      font-family: 'JetBrains Mono', monospace;
      font-size: 8pt;
      font-weight: 600;
      letter-spacing: 0.08em;
      background: #e2e8f0;
      color: #334155;
      padding: 3px 8px;
      border-radius: 4px;
      text-transform: uppercase;
    }}

    .doc-title {{
      font-size: 20pt;
      font-weight: 800;
      color: #0f172a;
      letter-spacing: -0.02em;
      margin-bottom: 4px;
    }}

    .doc-subtitle {{
      font-size: 11pt;
      color: #64748b;
      font-weight: 500;
    }}

    .meta-grid {{
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 10px;
      margin: 14px 0 20px 0;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 12px 16px;
    }}

    .meta-item {{
      display: flex;
      flex-direction: column;
    }}

    .meta-label {{
      font-size: 7.5pt;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: #64748b;
    }}

    .meta-val {{
      font-size: 11pt;
      font-weight: 800;
      color: #0f172a;
      font-family: 'JetBrains Mono', monospace;
    }}

    .summary-table-section {{
      margin-bottom: 24px;
      page-break-after: always;
    }}

    .section-heading {{
      font-size: 12pt;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: #0f172a;
      border-bottom: 2px solid #e2e8f0;
      padding-bottom: 6px;
      margin-bottom: 12px;
      display: flex;
      align-items: center;
      gap: 6px;
    }}

    .quick-table {{
      width: 100%;
      border-collapse: collapse;
      font-size: 9.5pt;
    }}

    .quick-table th {{
      background: #0f172a;
      color: #ffffff;
      padding: 8px 10px;
      text-align: left;
      font-size: 8.5pt;
      font-weight: 700;
      letter-spacing: 0.04em;
    }}

    .quick-table td {{
      padding: 8px 10px;
      border-bottom: 1px solid #e2e8f0;
      vertical-align: middle;
    }}

    .quick-table tr:nth-child(even) {{
      background: #f8fafc;
    }}

    .question-card {{
      background: #ffffff;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      padding: 14px 16px;
      margin-bottom: 18px;
      break-inside: avoid;
      page-break-inside: avoid;
    }}

    .card-header {{
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 10px;
    }}

    .q-title-group {{
      display: flex;
      align-items: center;
      gap: 8px;
    }}

    .q-pill {{
      background: #0f172a;
      color: #ffffff;
      font-family: 'JetBrains Mono', monospace;
      font-size: 8pt;
      font-weight: 800;
      padding: 3px 8px;
      border-radius: 4px;
      letter-spacing: 0.05em;
    }}

    .category-pill {{
      background: #eff6ff;
      color: #1d4ed8;
      border: 1px solid #bfdbfe;
      font-size: 8pt;
      font-weight: 700;
      padding: 3px 8px;
      border-radius: 4px;
    }}

    .points-pill {{
      font-family: 'JetBrains Mono', monospace;
      font-size: 8.5pt;
      font-weight: 700;
      color: #475569;
    }}

    .q-prompt {{
      font-size: 11pt;
      font-weight: 700;
      color: #0f172a;
      line-height: 1.45;
      margin-bottom: 12px;
    }}

    .options-container {{
      display: flex;
      flex-direction: column;
      gap: 6px;
      margin-bottom: 12px;
    }}

    .option-item {{
      display: flex;
      align-items: flex-start;
      gap: 8px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 7px 10px;
      font-size: 9.5pt;
      color: #334155;
    }}

    .option-badge {{
      font-family: 'JetBrains Mono', monospace;
      font-size: 7.5pt;
      font-weight: 700;
      padding: 2px 6px;
      border-radius: 3px;
      background: #e2e8f0;
      color: #475569;
      white-space: nowrap;
    }}

    .correct-option {{
      background: #ecfdf5;
      border: 1.5px solid #10b981;
      color: #064e3b;
    }}

    .correct-badge {{
      background: #10b981;
      color: #ffffff;
    }}

    .option-text {{
      line-height: 1.4;
    }}

    .solution-box {{
      background: #f0fdf4;
      border-left: 4px solid #10b981;
      border-radius: 0 6px 6px 0;
      padding: 10px 12px;
      font-size: 9pt;
      line-height: 1.45;
    }}

    .solution-header {{
      color: #047857;
      font-weight: 700;
      font-size: 9.5pt;
      margin-bottom: 4px;
    }}

    .solution-rationale {{
      color: #1f2937;
    }}

    .doc-footer {{
      margin-top: 30px;
      padding-top: 10px;
      border-top: 1px solid #e2e8f0;
      display: flex;
      justify-content: space-between;
      font-size: 8pt;
      color: #94a3b8;
      font-family: 'JetBrains Mono', monospace;
    }}
  </style>
</head>
<body>

  <div class="document-header">
    <div class="brand-bar">
      <div class="brand-logo">NULL ORIGIN // COMPETITION LEDGER</div>
      <div class="brand-tag">CONFIDENTIAL · VERIFIED MASTER KEY</div>
    </div>
    <h1 class="doc-title">Cyber Defense Challenge 2026</h1>
    <div class="doc-subtitle">Official 10-Question Tournament Bank & In-Depth Technical Solutions Guide</div>

    <div class="meta-grid">
      <div class="meta-item">
        <span class="meta-label">Total Questions</span>
        <span class="meta-val">10 Items</span>
      </div>
      <div class="meta-item">
        <span class="meta-label">Total Points</span>
        <span class="meta-val">1,000 PTS</span>
      </div>
      <div class="meta-item">
        <span class="meta-label">Time Per Question</span>
        <span class="meta-val">20 Seconds</span>
      </div>
      <div class="meta-item">
        <span class="meta-label">Security Domains</span>
        <span class="meta-val">7 Core Areas</span>
      </div>
    </div>
  </div>

  <div class="summary-table-section">
    <div class="section-heading">
      <span>📋 Quick Reference Master Answer Key</span>
    </div>
    <table class="quick-table">
      <thead>
        <tr>
          <th style="width: 8%;">Item</th>
          <th style="width: 22%;">Domain</th>
          <th style="width: 14%;">Key</th>
          <th>Verified Correct Answer</th>
        </tr>
      </thead>
      <tbody>
        {''.join(table_rows)}
      </tbody>
    </table>
  </div>

  <div class="section-heading">
    <span>🔍 Comprehensive Questions, Options & Technical Deep Dive</span>
  </div>

  {''.join(html_cards)}

  <div class="doc-footer">
    <span>Null Origin Cyber Defense Competition 2026</span>
    <span>Generated: 12 November 2026</span>
    <span>Standard IEEE / NIST Security Evaluation Standard</span>
  </div>

</body>
</html>
"""

temp_html = Path(r"C:\Users\Priyanka\AppData\Local\Temp\cyber_defense_answer_key.html")
with open(temp_html, "w", encoding="utf-8") as f:
    f.write(full_html)

out_pdf_proj = Path(r"C:\Users\Priyanka\OneDrive\Desktop\Quiz-Competition\Cyber_Defense_Challenge_2026_Answer_Key.pdf")
out_pdf_artifact = Path(r"C:\Users\Priyanka\.gemini\antigravity\brain\629ed097-9b0a-4e4b-b08c-5dc4258886fd\Cyber_Defense_Challenge_2026_Answer_Key.pdf")

chrome_exe = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
cmd = [
    chrome_exe,
    "--headless=new",
    "--disable-gpu",
    "--no-pdf-header-footer",
    f"--print-to-pdf={out_pdf_proj}",
    f"file:///{str(temp_html).replace('\\', '/')}"
]

print("Compiling PDF to project directory...")
subprocess.run(cmd, check=True)

# Copy to artifact directory
import shutil
shutil.copyfile(out_pdf_proj, out_pdf_artifact)

print("PDF Size in Project:", os.path.getsize(out_pdf_proj), "bytes")
print("PDF Size in Artifact:", os.path.getsize(out_pdf_artifact), "bytes")
print("Done!")
