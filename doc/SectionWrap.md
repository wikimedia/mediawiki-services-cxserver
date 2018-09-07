Section wrapping
================
See lib/lineardoc/Doc.js#wrapSections.

Let us take the following example:

```
 <table id="t1">
 <tbody>
 <tr><td>Table cell content 1</td></tr>
 <tr><td>Table cell content 2</td></tr>
 </tbody>
 <table>
```

When we see ```<table>``` opening and if we are not in any section(currSection is null), we start a section.

``` <section> <table id="t1">```

At this point currSection is "t1".

In this type==='close' block, we will get the following tags

```
 td. Does the getTagId(td) of tag match with t1? No. dont close section.
 tr. Does the getTagId(tr) of tag match with t1? No. dont close section.
 td. Does the getTagId(td) of tag match with t1? No. dont close section.
 tr. Does the getTagId(tr) of tag match with t1? No. dont close section.
 tbody. Does the getTagId(tbody) of tag match with t1? No. dont close section.
 table.  Does the getTagId(table) of tag match with t1? YES. Close section.
 ```

So we get
```
 <section>
 <table id="t1">
 <tbody>
 <tr><td>Table cell content 1</td></tr>
 <tr><td>Table cell content 2</td></tr>
 </tbody>
 <table>
 </section>
 ```

Table is a good example since table is block and its childrens are also blocks. See Parser.js#blockTags

Template fragements are handled in type=== 'open' block
` if ( prevSection === getTagId( tag ) ) {`

Will explain with example:

```
 <div about="mwt1" data-mw={}></div>
 <table about="mwt1" id="t1">
 <tbody>
 <tr><td>Table cell content 1</td></tr>
 <tr><td>Table cell content 2</td></tr>
 </tbody>
 <table>
 ```
Once we see div close, we have wrapped it in section.

 ```<section><div about="mwt1" data-mw={}></div></section>```

At this point currSection is null. prevSection is mwt1

Now we see a blockspace. That is \n - new line between div and table.
In the type === 'blockspace', we insert that to the previous section. So we get
```
 <section><div about="mwt1" data-mw={}></div>
 </section>
```

No we see table opening. But has same `getTagId()`. That is `mwt1`. We undo the section addition. So we get

```
 <section><div about="mwt1" data-mw={}></div>
 (newline is present here)
 ```

and add the table. At the end of table, close the section.
So we get
```
 <section>
 <div about="mwt1" data-mw={}></div>
 <table about="mwt1" id="t1">
 <tbody>
 <tr><td>Table cell content 1</td></tr>
 <tr><td>Table cell content 2</td></tr>
 </tbody>
 <table>
 </section>
```
Instead of div, if it is `<span  about="mwt1" >` , it goes to `type==='textblock'` since it is inline element.
