/* dev-logs.js */

'use strict';

document.addEventListener('DOMContentLoaded', async function() {
    document.querySelectorAll('input,select').forEach(el => el.onchange = function() {
        this.form.submit(); // autosubmit form on change
    });

    document.querySelectorAll('td[data-pathfull]').forEach(el => el.onclick = function() {
        // swap displayed text and data-pathfull
        const tmp = this.textContent;
        this.textContent = this.dataset.pathfull;
        this.dataset.pathfull = tmp;
    });

    // replace ip addresses with domains (asynchronously)
    document.querySelectorAll('td.ip-domain').forEach(td => td.style.cursor = 'wait');
    const Ips = Array.from(document.querySelectorAll('td.ip-domain')).map(td => td.title);
    const IpsDistinct = [ ...new Set(Ips) ];
    for (const ip of IpsDistinct) {
        const headers = { Accept: 'application/json' };
        const credentials = 'same-origin';
        const response = await fetch(`/dev/ajax/ip-domain/${ip}`, { method: 'GET', headers, credentials });
        if (response.ok) {
            const body = await response.json();
            document.querySelectorAll(`td.ip-domain[title="${ip}"]`).forEach(td => td.style.cursor = 'default');
            document.querySelectorAll(`td.ip-domain[title="${ip}"]`).forEach(td => td.title = body.domain);
        } else {
            alert(response.statusText);
        }
    }

    // toggle error stack trace displays
    document.querySelectorAll('.toggle').forEach(el => el.onclick = function() {
        this.parentElement.nextElementSibling.classList.toggle('hide');
        this.textContent = this.textContent=='▼' ? '▲' : '▼';
    });
});
