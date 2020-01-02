/* teams-edit.js *//* global teamId */

'use strict';

document.addEventListener('DOMContentLoaded', function() {
    document.querySelector('button.add-membership').onclick = function() {
        const select = document.querySelector('select.add-membership');
        select.classList.toggle('hide');
        select.focus();
    };

    document.querySelector('select.add-membership').onchange = addMembership;

    document.querySelectorAll('button.delete-membership').forEach(button => button.onclick = deleteMembership);

    async function addMembership(event) {
        const select = event.target;
        const values = JSON.stringify({
            TeamId:   teamId,
            MemberId: this.value,
            JoinedOn: new Date().toISOString().replace('T', ' ').split('.')[0],
        });
        const headers = { 'Content-Type': 'application/json', Accept: 'application/json' };
        const credentials = 'same-origin';
        const response = await fetch('/ajax/team-members', { method: 'POST', body: values, headers, credentials });
        if (response.ok) {
            // add new row (cloned from 1st membership row), remove entry from select
            const body = await response.json();
            const thisRow = select.closest('tr');
            if (thisRow.nextElementSibling) {
                const newRow = thisRow.nextElementSibling.cloneNode(true);
                newRow.id = select.value;
                newRow.children[0].textContent = select.options[select.selectedIndex].label;
                newRow.querySelector('button').value = body.TeamMemberId;
                newRow.querySelector('button').onclick = deleteMembership; // onclick doesn't get cloned
                thisRow.insertAdjacentElement('afterend', newRow);
                select.remove(select.selectedIndex);
                select.classList.add('hide');
            } else {
                // no tr to clone - cop out & reload page for now...
                window.location.reload();
            }
        } else {
            window.alert(response.statusText);
        }
    }

    async function deleteMembership(event) {
        const button = event.target;
        const teamMembershipId = button.value;
        const headers = { Accept: 'application/json' };
        const credentials = 'same-origin';
        const response = await fetch('/ajax/team-members/'+teamMembershipId, { method: 'DELETE', headers, credentials });
        if (response.ok) {
            const thisRow = button.closest('tr');
            const memberId = thisRow.id;
            const memberName = thisRow.children[0].textContent;
            const selector = button.closest('table').querySelector('select');
            const opt = document.createElement('option');
            opt.value = memberId;
            opt.text = memberName;
            selector.add(opt);
            thisRow.remove();
        } else {
            window.alert(response.statusText);
        }
    }

    // escape will hide 'add-membership' select if it is displayed
    document.onkeyup = function(event) {
        if (event.key == 'Escape') document.querySelector('select.add-membership').classList.add('hide');
    };
});
