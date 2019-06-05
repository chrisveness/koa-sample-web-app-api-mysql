/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */
/* Handlebars helpers for setting selected option and checked checkboxes / radio buttons          */
/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */

import { JSDOM as JsDom } from 'jsdom'; // DOM Document interface in Node!

const document = new JsDom().window.document;


class HandlebarsHelpers {

    static checked(value, options) {
        const div = document.createElement('div'); // create a container div
        div.innerHTML = options.fn(this);          // parse content into dom
        if (typeof value == 'string') {
            div.querySelectorAll('input[type=radio],input[type=checkbox]').forEach(function(input) {
                // if input value matches supplied value, check it
                if (input.value == value) input.defaultChecked = true;
            });
        }
        if (typeof value == 'object') {
            div.querySelectorAll('input[type=radio],input[type=checkbox]').forEach(function(input) {
                // if input value is included in supplied value, check it
                if (value && value.includes(input.value)) input.defaultChecked = true;
            });
        }
        return div.innerHTML;
    }

    static selected(value, options) {   // stackoverflow.com/questions/13046401#answer-15373215
        const select = document.createElement('select'); // create a select element
        select.innerHTML = options.fn(this);             // populate it with the option HTML
        select.value = value;                            // set the value
        if (select.children[select.selectedIndex]) {     // if selected node exists add 'selected' attribute
            select.children[select.selectedIndex].setAttribute('selected', '');
        }
        return select.innerHTML;
    }

    static selectedOptgrp(value, options) { // stackoverflow.com/questions/13046401#answer-15373215
        const select = document.createElement('select');     // create a select element
        select.innerHTML = options.fn(this);                 // populate it with the option HTML
        select.value = value;                                // set the value
        let g = 0, i = select.selectedIndex;
        while (i >= select.children[g].children.length) { i -= select.children[g].children.length; g++; }
        if (select.children[g].children[i]) {                // if selected node exists add 'selected' attribute
            select.children[g].children[i].setAttribute('selected', true);
        }
        return select.innerHTML;
    }

}

/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */

export default HandlebarsHelpers;
