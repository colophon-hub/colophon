# Public Records Desk

Investigations can track records requests without assuming a particular jurisdiction. Request types include federal, state, municipal and other regimes, with a free-form law name and jurisdiction.

Requests can store public/internal titles, why the request matters, records sought, agency and component, filing URL/method, request text, date range, preferred format, fee-waiver language, expedited-processing language, filing and response dates, tracking number, workflow status, appeal/fee state, public notes and internal notes.

Related documents can be typed as acknowledgements, clarifications, fee notices, correspondence, denials, appeals, appeal decisions, releases, responsive records or other. Each document has independent public/private visibility.

## Public boundary

The public investigations API uses an explicit records projection. Private requests are omitted. Internal notes, internal titles, fee/expedited drafting language and private documents are removed before JSON is returned. Request text is returned only when the editor explicitly marks it public.

## Optional U.S. FOIA.gov adapter

The core records model is jurisdiction-neutral. U.S. federal installations can set `FOIA_GOV_API_KEY` to enable the editor-only FOIA.gov agency-component lookup. The key is read only on the server and is never sent to public browser code.
