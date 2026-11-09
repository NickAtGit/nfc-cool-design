/* The editor's two halves. From 900 px up they stand side by side and this does
   nothing; below, one shows at a time, chosen by setView (the Blocks/Page
   switch calls it).

     <div class="ed-split" data-view="blocks">
       <div class="ed-split-list">...</div>
       <div class="ed-split-frame">...</div>
     </div> */
export function split(el) {
  return {
    el,
    view: () => el.dataset.view,
    setView(view) { el.dataset.view = view; },
  };
}
