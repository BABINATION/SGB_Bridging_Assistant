(() => {
    // --- State flags ---
    let isIcapManuallySet = false;
    let isAdditionalLoanManuallySet = false;
  
    // Helpers available across functions
    const inputIds = [
      'selling-price',
      'current-mortgage',
      'contract-price',
      'stamp-duty',
      'sundry-costs',
      'current-funds',
      'interest-rate',
    ];
  
    function toggleInputBorder(element) {
      if (element.value) element.classList.add('has-input');
      else element.classList.remove('has-input');
    }
  
    function autoFormatNumber(event) {
      const input = event.target;
      if (input.id === 'interest-rate') return; // don't format % as currency
      const value = input.value.replace(/[^0-9]/g, '');
      input.value = value ? Number(value).toLocaleString('en-US') : '';
    }
  
    function parseCurrency(id) {
      const el = document.getElementById(id);
      if (!el) return 0;
      const value = el.value.replace(/[^0-9.]/g, '');
      return parseFloat(value) || 0;
    }
  
    function parseCurrencyFromText(id) {
      const el = document.getElementById(id);
      if (!el) return 0;
      const value = el.textContent.replace(/[^0-9.]/g, '');
      return parseFloat(value) || 0;
    }
  
    function parseDecimal(id) {
      const el = document.getElementById(id);
      if (!el) return 0;
      const value = el.value.replace(/[^0-9.]/g, '');
      return parseFloat(value) || 0;
    }
  
    function formatCurrency(number) {
      return new Intl.NumberFormat('en-AU', {
        style: 'currency',
        currency: 'AUD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(number);
    }
  
    function formatSimpleNumber(number) {
      return Number((number || 0).toFixed(2)).toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
    }
  
    function getDaysInMonth(year, month) {
      return new Date(year, month + 1, 0).getDate();
    }
  
    // --- Main calc + render ---
    function updateCalculations() {
      const resultsOutput = document.getElementById('results-output');
      const timelineList = document.getElementById('timeline-list');
  
      // 1) Inputs
      const sellingPrice = parseCurrency('selling-price');
      const currentMortgage = parseCurrency('current-mortgage');
      const contractPrice = parseCurrency('contract-price');
      const stampDuty = parseCurrency('stamp-duty');
      const sundryCosts = parseCurrency('sundry-costs');
      const currentFunds = parseCurrency('current-funds');
      const interestRate = parseDecimal('interest-rate');
  
      // 2) Core math
      const fundsForNewPurchase = contractPrice + stampDuty + sundryCosts;
      const fundsToPayOffMortgage = currentMortgage;
      const totalFundsRequired = fundsForNewPurchase + fundsToPayOffMortgage;
      const maxBridgingLoan = Math.min(sellingPrice * 0.85, totalFundsRequired);
      const peakDebt = totalFundsRequired - currentFunds;
      const assessedRate = interestRate + 1.0;
  
      let additionalNewLoan = isAdditionalLoanManuallySet
        ? parseCurrency('additional-loan-input')
        : 0;
      if (additionalNewLoan > maxBridgingLoan) {
        additionalNewLoan = maxBridgingLoan;
      }
  
      const finalBridgingLoan = Math.max(0, maxBridgingLoan - additionalNewLoan);
  
      const autoIcap = (() => {
        const dailyRate = assessedRate / 100 / 365;
        const daysInMonths = [];
        const now = new Date();
        let y = now.getFullYear();
        let m = now.getMonth();
        for (let i = 0; i < 12; i++) {
          daysInMonths.push(getDaysInMonth(y, m));
          m++;
          if (m > 11) {
            m = 0;
            y++;
          }
        }
        let principal = finalBridgingLoan;
        let totalIcap = 0;
        for (const days of daysInMonths) {
          const monthlyInterest = principal * dailyRate * days;
          totalIcap += monthlyInterest;
          principal += monthlyInterest;
        }
        return totalIcap;
      })();
  
      const icap = isIcapManuallySet ? parseCurrency('icap-input') : autoIcap;
      const icapDescription = isIcapManuallySet
        ? '(Self Entered)'
        : `(Calculated at assessed rate of ${assessedRate.toFixed(2)}%)`;
  
      const totalPeakDebt = peakDebt + icap;
      const peakSecurity = sellingPrice + contractPrice;
      const peakLvr = peakSecurity > 0 ? (totalPeakDebt / peakSecurity) * 100 : 0;
  
      const minimumEndDebt = totalPeakDebt - maxBridgingLoan;
      const totalEndDebt = minimumEndDebt + additionalNewLoan;
      const endSecurity = contractPrice;
      const endLvr = endSecurity > 0 ? (totalEndDebt / endSecurity) * 100 : 0;
  
      let lvrAlertHTML = '';
      if (peakLvr > 80) {
        const extraFundsNeeded = totalPeakDebt - peakSecurity * 0.8;
        lvrAlertHTML = `
          <div class="lvr-alert-box">
            <h4 class="font-bold">Peak Debt LVR Alert!</h4>
            <p>Peak LVR cannot exceed 80%. You need to contribute extra funds of
            <strong class="font-bold">${formatCurrency(extraFundsNeeded)}</strong>.</p>
          </div>`;
      }
  
      // 3) Cards
      const card1_FundsRequired = `
        <div class="info-card glass-card p-6 rounded-lg shadow-lg">
          <h3 class="font-display text-xl font-bold text-white mb-4">Total Funds Required</h3>
          <div class="space-y-2">
            <div class="result-item">
              <span class="result-label">For New Purchase:</span>
              <span class="result-value">${formatCurrency(fundsForNewPurchase)}</span>
            </div>
            <div class="result-item">
              <span class="result-label">To Payout Existing Loan:</span>
              <span class="result-value">${formatCurrency(fundsToPayOffMortgage)}</span>
            </div>
            <div class="result-item result-total">
              <span class="result-label">Total Funds Required:</span>
              <span class="result-value">${formatCurrency(totalFundsRequired)}</span>
            </div>
          </div>
        </div>`;
  
      const card2_PeakDebt = `
        <div class="info-card glass-card p-6 rounded-lg shadow-lg">
          <h3 class="font-display text-xl font-bold text-white mb-4">Peak Debt & LVR</h3>
          <div class="space-y-2">
            <div class="result-item">
              <span class="result-label">Peak Debt (Loan Required):</span>
              <span class="result-value" id="peak-debt-value">${formatCurrency(peakDebt)}</span>
            </div>
            <div class="result-item">
              <span class="result-label">(+) Interest (ICAP):</span>
              <div class="relative flex items-center w-1/2">
                <span class="absolute inset-y-0 left-0 flex items-center pl-3 text-white/50">$</span>
                <input type="text" id="icap-input" class="editable-input input-field" value="${formatSimpleNumber(icap)}" inputmode="numeric">
                <button id="reset-icap-btn" class="reset-btn" title="Reset to calculated value">
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 110 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clip-rule="evenodd" /></svg>
                </button>
              </div>
            </div>
            <p class="text-xs text-white/60 pl-4" id="icap-description">${icapDescription}</p>
            <div class="result-item result-total">
              <span class="result-label">Total Peak Debt:</span>
              <span class="result-value" id="total-peak-debt-value">${formatCurrency(totalPeakDebt)}</span>
            </div>
            <div class="result-item mt-4">
              <span class="result-label">Peak Security:</span>
              <span class="result-value" id="peak-security-value">${formatCurrency(peakSecurity)}</span>
            </div>
            <div class="result-item font-bold text-lg">
              <span class="result-label">Peak LVR:</span>
              <span class="result-value ${peakLvr > 80 ? 'lvr-warning-text' : ''}" id="peak-lvr-value">${peakLvr.toFixed(2)}%</span>
            </div>
            <div id="lvr-alert">${lvrAlertHTML}</div>
          </div>
        </div>`;
  
      const card3_MaxBridging = `
        <div class="info-card glass-card p-6 rounded-lg shadow-lg">
          <h3 class="font-display text-xl font-bold text-white mb-4">Bridging Loan Details</h3>
          <div class="space-y-2">
            <div class="result-item">
              <span class="result-label">Max Bridging Loan:</span>
              <span class="result-value" id="max-bridging-loan-value">${formatCurrency(maxBridgingLoan)}</span>
            </div>
            <p class="text-xs text-white/60 pt-1">(Lower of 85% of property value or Total Funds Required)</p>
            <div class="result-item result-total">
              <span class="result-label">Final Bridging Loan:</span>
              <span class="result-value" id="final-bridging-loan-value">${formatCurrency(finalBridgingLoan)}</span>
            </div>
            <p class="text-xs text-white/60 pl-4">(Max Bridging Loan - Additional New Loan)</p>
          </div>
        </div>`;
  
      const card4_Residual = `
        <div class="info-card glass-card p-6 rounded-lg shadow-lg">
          <h3 class="font-display text-xl font-bold text-white mb-4">Residual Lending (End Position)</h3>
          <div class="space-y-2">
            <div class="result-item">
              <span class="result-label">Minimum End Debt:</span>
              <span class="result-value" id="min-end-debt-value">${formatCurrency(minimumEndDebt)}</span>
            </div>
            <p class="text-xs text-white/60 pl-4">(Total Peak Debt - Max Bridging Loan)</p>
            <div class="result-item">
              <span class="result-label">Additional New Loan:</span>
              <div class="relative flex items-center w-1/2">
                <span class="absolute inset-y-0 left-0 flex items-center pl-3 text-white/50">$</span>
                <input type="text" id="additional-loan-input" class="editable-input input-field" value="${formatSimpleNumber(additionalNewLoan)}" inputmode="numeric">
                <button id="confirm-additional-loan" class="confirm-btn">Confirm</button>
              </div>
            </div>
            <p class="text-xs text-white/60 pl-4">(Max: ${formatCurrency(maxBridgingLoan)}, reduces bridging loan)</p>
            <div class="result-item result-total">
              <span class="result-label">Total End Debt:</span>
              <span class="result-value" id="total-end-debt-value">${formatCurrency(totalEndDebt)}</span>
            </div>
            <div class="result-item mt-4">
              <span class="result-label">End Security:</span>
              <span class="result-value" id="end-security-value">${formatCurrency(endSecurity)}</span>
            </div>
            <div class="result-item font-bold text-lg">
              <span class="result-label">End LVR:</span>
              <span class="result-value ${endLvr > 80 ? 'lvr-warning-text' : ''}" id="end-lvr-value">${endLvr.toFixed(2)}%</span>
            </div>
            <div class="note-box">
              <p><strong>Note:</strong> Review end LVR to ensure that it is allowable under the applicable LVR policy.</p>
              <p id="borrowing-capacity-note" class="mt-2"><strong>Note:</strong> Check the borrowing capacity for the end debt amount of ${formatCurrency(totalEndDebt)}.</p>
            </div>
          </div>
        </div>`;
  
      // 4) Render
      resultsOutput.innerHTML = `
        ${card1_FundsRequired}
        ${card2_PeakDebt}
        ${card3_MaxBridging}
        ${card4_Residual}
      `;
  
      // 5) Timeline
      updateTimeline({
        currentMortgage,
        peakDebt,
        peakLvr,
        totalPeakDebt,
        peakSecurity,
        maxBridgingLoan,
        finalBridgingLoan,
        totalEndDebt,
        endLvr,
        additionalNewLoan,
        endSecurity,
        icap,
        timelineList,
      });
  
      // 6) Style editable inputs immediately
      ['icap-input', 'additional-loan-input'].forEach((id) => {
        const input = document.getElementById(id);
        if (input) toggleInputBorder(input);
      });
  
      // Attach dynamic listeners on the rendered cards
      attachResultsListeners(resultsOutput);
    }
  
    function updateTimeline(data) {
      const {
        currentMortgage,
        peakDebt,
        peakLvr,
        totalPeakDebt,
        peakSecurity,
        maxBridgingLoan,
        finalBridgingLoan,
        totalEndDebt,
        endLvr,
        additionalNewLoan,
        endSecurity,
        icap,
        timelineList,
      } = data;
  
      let html = '';
      html += `<li>After the bridging loan is settled, first of all your existing mortgage will be refinanced. SGB will pay the <strong class="text-brand-yellow">${formatCurrency(currentMortgage)}</strong> to your existing lender and possess the current property to be later sold as collateral.</li>`;
      html += `<li>Total funds required initially is <strong class="text-brand-yellow">${formatCurrency(peakDebt)}</strong> which covers your current mortgage plus the purchase price of new property along with stamp duty and fees.</li>`;
      html += `<li>SGB will calculate 12 months of interest on the bridging loan portion and capitalize it to your peak debt. The capitalized interest is <strong class="text-brand-yellow">${formatCurrency(icap)}</strong> in your case.</li>`;
  
      if (peakLvr > 80) {
        const extraFundsNeeded = totalPeakDebt - peakSecurity * 0.8;
        html += `<li>The maximum LVR allowed by SGB on peak debt is 80%, so you will need to contribute <strong class="text-brand-yellow">${formatCurrency(extraFundsNeeded)}</strong> to get the final peak LVR at 80.00%.</li>`;
      } else {
        html += `<li>The maximum LVR allowed by SGB on peak debt is 80%. Your peak LVR is <strong class="text-brand-yellow">${peakLvr.toFixed(
          2
        )}%</strong> which is within SGB's policy requirement.</li>`;
      }
  
      html += `<li>Once the purchase settles, you will have 12 months of bridging period within which you will need to sell the current property.</li>`;
      html += `<li>Since the interest amount for 12 months is already capitalized to the peak debt, you are not required to pay any interest up until the first 12 months or till the current property is sold, whichever occurs first.</li>`;
      html += `<li>The 85% of your current property's valuation is considered as the maximum bridging loan amount which is <strong class="text-brand-yellow">${formatCurrency(
        maxBridgingLoan
      )}</strong> in your case. The 15% is considered as a buffer for any fluctuation on the sale price.</li>`;
      html += `<li>Once the property is sold, the amount equaling to the bridging loan i.e, <strong class="text-brand-yellow">${formatCurrency(
        finalBridgingLoan
      )}</strong> will be used to pay off the peak debt. Any sale proceed over the bridging loan amount will be available to you.</li>`;
      html += `<li>So after paying the peak debt down by <strong class="text-brand-yellow">${formatCurrency(
        maxBridgingLoan
      )}</strong>, your end debt will be <strong class="text-brand-yellow">${formatCurrency(
        totalEndDebt - additionalNewLoan
      )}</strong>. This is the minimum end debt amount, and your end LVR will be <strong class="text-brand-yellow">${(
        ((totalEndDebt - additionalNewLoan) / (endSecurity || 1)) *
        100
      ).toFixed(2)}%</strong>.</li>`;
  
      if (additionalNewLoan > 0) {
        html += `<li>If your borrowing capacity allows, you can increase your end debt by <strong class="text-brand-yellow">${formatCurrency(
          additionalNewLoan
        )}</strong> such that the total end debt becomes <strong class="text-brand-yellow">${formatCurrency(
          totalEndDebt
        )}</strong> at an end LVR of <strong class="text-brand-yellow">${endLvr.toFixed(
          2
        )}%</strong>. This also reduces your bridging loan amount meaning you will retain the additional amount from the net sale proceeds of your property.</li>`;
      }
  
      html += `<li>So your final end debt will be <strong class="text-brand-yellow">${formatCurrency(
        totalEndDebt
      )}</strong> and you will start paying P&I repayments on this amount moving forward.</li>`;
  
      timelineList.innerHTML = html;
    }
  
    function attachInputsListeners() {
      inputIds.forEach((id) => {
        const el = document.getElementById(id);
        if (!el) return;
        el.addEventListener('input', (e) => {
          if (e.target.id !== 'interest-rate') autoFormatNumber(e);
          toggleInputBorder(e.target);
          isIcapManuallySet = false;
          isAdditionalLoanManuallySet = false;
          updateCalculations();
        });
        // initial border state
        toggleInputBorder(el);
      });
    }
  
    function attachResultsListeners(resultsOutput) {
      // Live input formatting for dynamic fields
      resultsOutput.addEventListener('input', (event) => {
        const t = event.target;
        if (!t) return;
        if (t.id === 'icap-input' || t.id === 'additional-loan-input') {
          autoFormatNumber(event);
          toggleInputBorder(t);
        }
      });
  
      resultsOutput.addEventListener('click', (event) => {
        const t = event.target;
        if (!t) return;
  
        const resetBtn = t.closest('#reset-icap-btn');
        if (t.id === 'confirm-additional-loan') {
          isAdditionalLoanManuallySet = true;
          updateCalculations();
        }
        if (resetBtn) {
          isIcapManuallySet = false;
          updateCalculations();
        }
      });
  
      resultsOutput.addEventListener('focusout', (event) => {
        if (event.target && event.target.id === 'icap-input') {
          isIcapManuallySet = true;
          updateCalculations();
        }
      });
    }
  
    // Init after DOM is parsed (we used `defer`, but this is extra-safe)
    document.addEventListener('DOMContentLoaded', () => {
      attachInputsListeners();
      updateCalculations();
    });
  })();
  