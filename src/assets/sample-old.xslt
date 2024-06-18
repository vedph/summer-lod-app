<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
  xmlns:tei="http://www.tei-c.org/ns/1.0" version="1.0">
  <xsl:output method="html" />
  <!-- remove WS only text nodes -->
  <xsl:strip-space elements="*" />

  <!-- apply-templates targets only DIRECT children of the context
        node, so when you are matching an element in any template, ensure
        to call it; otherwise, if the target element is not a direct
        child of the context node in the caller template, you will
        not match -->

  <!-- order matters: XSLT gives priority to templates which
        appear later in the document, so put the most generic ones
        first in case of potential conflicts. -->

  <!-- BODY -->
  <!-- lb -->
  <!-- <br/> -->
  <xsl:template match="tei:lb">
    <br />
  </xsl:template>

  <!-- pb -->
  <!-- CSS: span.pb, span.super
        <span class="pb" title="page [N]">
           <span class="super">N</span> if N, else black vrt rectangle
         </span>
    -->
  <xsl:template match="tei:pb">
    <xsl:element name="span">
      <xsl:attribute name="class">pb</xsl:attribute>
      <xsl:attribute name="title">page <xsl:value-of select="@n" /></xsl:attribute>
      <xsl:choose>
        <xsl:when test="@n">
          <span class="super">
            <xsl:value-of select="@n" />
          </span>
        </xsl:when>
        <xsl:otherwise>
          <xsl:text>&#x25ae;</xsl:text>
        </xsl:otherwise>
      </xsl:choose>
    </xsl:element>
  </xsl:template>

  <!-- div -->
  <!-- <a name="d_N"> (only for body)
         <div>...</div> -->
  <xsl:template match="tei:div">
    <xsl:if test="@n and ancestor::tei:body">
      <xsl:element name="a">
        <xsl:attribute name="name">d_<xsl:value-of select="@n" /></xsl:attribute>
      </xsl:element>
    </xsl:if>
    <div>
      <xsl:apply-templates />
    </div>
  </xsl:template>

  <!-- p -->
  <!--
        <p>...</p>
    -->
  <xsl:template match="tei:p">
    <p>
      <xsl:apply-templates />
    </p>
  </xsl:template>

  <!-- title -->
  <!--
        <span class="LNAME">...</span>
    -->
  <xsl:template match="tei:title">
    <span class="{local-name()}">
      <xsl:apply-templates />
    </span>
  </xsl:template>

  <!-- title in head -->
  <!-- CSS: h2.@type
        in figure: fallback to default for title
        else:
        <a name="h_N"> if @n
        <h2 class="@type">...</h2>
    -->
  <xsl:template match="tei:head/tei:title">
    <xsl:choose>
      <xsl:when test="ancestor::tei:figure">
        <xsl:apply-templates />
      </xsl:when>
      <xsl:otherwise>
        <xsl:if test="@n">
          <xsl:element name="a">
            <xsl:attribute name="name">h_<xsl:value-of select="@n" /></xsl:attribute>
          </xsl:element>
        </xsl:if>
        <xsl:element name="h2">
          <xsl:if test="@type">
            <xsl:attribute name="class">
              <xsl:value-of select="@type" />
            </xsl:attribute>
          </xsl:if>
          <xsl:apply-templates />
        </xsl:element>
      </xsl:otherwise>
    </xsl:choose>
  </xsl:template>

  <!-- list -->
  <!--
        <ol>...</ol> if @type="numbered"
        <ul>...</ul> else
    -->
  <xsl:template match="tei:list">
    <xsl:choose>
      <xsl:when test="@type = 'numbered'">
        <ol>
          <xsl:apply-templates />
        </ol>
      </xsl:when>
      <xsl:otherwise>
        <ul>
          <xsl:apply-templates />
        </ul>
      </xsl:otherwise>
    </xsl:choose>
  </xsl:template>

  <!-- item -->
  <!--
        <li>...</li>
    -->
  <xsl:template match="tei:item">
    <li>
      <xsl:apply-templates />
    </li>
  </xsl:template>

  <!-- q or quote -->
  <!--
        <cite>...</cite> + space
    -->
  <xsl:template match="tei:q | tei:quote">
    <cite>
      <xsl:apply-templates />
    </cite>
    <xsl:text> </xsl:text>
  </xsl:template>

  <!-- ref -->
  <!-- CSS: span.ref
        <a href="@target">...</a> when @target starts with http
        <span class="ref">...</span> else
    -->
  <xsl:template match="tei:ref">
    <xsl:choose>
      <xsl:when test="starts-with(@target, 'http')">
        <xsl:element name="a">
          <xsl:attribute name="href">
            <xsl:value-of select="@target" />
          </xsl:attribute>
          <xsl:apply-templates />
        </xsl:element>
      </xsl:when>
      <xsl:otherwise>
        <xsl:element name="span">
          <xsl:attribute name="class">ref</xsl:attribute>
          <xsl:apply-templates />
        </xsl:element>
      </xsl:otherwise>
    </xsl:choose>
  </xsl:template>

  <!-- bibl -->
  <!-- CSS: span.bibl
        space + <span class="bibl">...</span>
    -->
  <xsl:template match="tei:bibl">
    <xsl:text> </xsl:text>
    <span class="bibl">
      <xsl:apply-templates />
    </span>
  </xsl:template>

  <!-- cit -->
  <!--
        <blockquote>...</blockquote>
    -->
  <xsl:template match="tei:cit">
    <blockquote>
      <xsl:apply-templates />
    </blockquote>
  </xsl:template>

  <!-- proper names -->
  <!-- CSS: span.name, span.persName, span.geogName, span.placeName, span.orgName
        <a href="@ref">...</a> if @ref and not in teiHeader
        <span class="LNAME">...</span>
    -->
  <xsl:template match="tei:name | tei:persName | tei:geogName | tei:placeName | tei:orgName">
    <xsl:choose>
      <xsl:when test="@ref and not(ancestor::tei:teiHeader)">
        <xsl:element name="a">
          <xsl:attribute name="class">name</xsl:attribute>
          <xsl:attribute name="href">
            <xsl:value-of select="@ref" />
          </xsl:attribute>
          <xsl:apply-templates />
        </xsl:element>
      </xsl:when>
      <xsl:otherwise>
        <xsl:element name="span">
          <xsl:attribute name="class">
            <xsl:value-of select="local-name(.)" />
          </xsl:attribute>
          <xsl:apply-templates />
        </xsl:element>
      </xsl:otherwise>
    </xsl:choose>
  </xsl:template>

  <!-- forename -->
  <!--
        <span title="forename">...</span> + space
    -->
  <xsl:template match="tei:forename">
    <xsl:element name="span">
      <xsl:attribute name="title">forename</xsl:attribute>
      <xsl:apply-templates />
    </xsl:element>
    <xsl:text> </xsl:text>
  </xsl:template>
  <!-- surname -->
  <!--
        <span title="surname">...</span> + space
    -->
  <xsl:template match="tei:surname">
    <xsl:element name="span">
      <xsl:attribute name="title">surname</xsl:attribute>
      <xsl:apply-templates />
    </xsl:element>
    <xsl:text> </xsl:text>
  </xsl:template>
  <!-- rolename -->
  <!--
        <span title="role">...</span> + space
    -->
  <xsl:template match="tei:roleName">
    <xsl:element name="span">
      <xsl:attribute name="title">role</xsl:attribute>
      <xsl:apply-templates />
    </xsl:element>
    <xsl:text> </xsl:text>
  </xsl:template>

  <!-- num -->
  <!-- CSS: span.num
        <span class="num" title="@value">...</span> + space
    -->
  <xsl:template match="tei:num">
    <xsl:element name="span">
      <xsl:attribute name="class">num</xsl:attribute>
      <xsl:if test="@value">
        <xsl:attribute name="title">
          <xsl:value-of select="@value" />
        </xsl:attribute>
      </xsl:if>
      <xsl:apply-templates />
    </xsl:element>
    <xsl:text> </xsl:text>
  </xsl:template>

  <!-- emph -->
  <!--
        <strong>...</strong>
    -->
  <xsl:template match="tei:emph">
    <strong>
      <xsl:apply-templates />
    </strong>
  </xsl:template>

  <!-- foreign -->
  <!-- CSS: span.foreign
        <span class="foreign" [title="@xml:lang"]>...</span>
    -->
  <xsl:template match="tei:foreign">
    <xsl:element name="span">
      <xsl:attribute name="class">foreign</xsl:attribute>
      <xsl:if test="@xml:lang">
        <xsl:attribute name="title">
          <xsl:value-of select="@xml:lang" />
        </xsl:attribute>
      </xsl:if>
      <xsl:apply-templates />
    </xsl:element>
  </xsl:template>

  <!-- distinct -->
  <!-- CSS: span.distinct
        <span class="distinct" [title="@type"]>...</span>
    -->
  <xsl:template match="tei:distinct">
    <xsl:element name="span">
      <xsl:attribute name="class">distinct</xsl:attribute>
      <xsl:if test="@type">
        <xsl:attribute name="title">
          <xsl:value-of select="@type" />
        </xsl:attribute>
      </xsl:if>
      <xsl:apply-templates />
    </xsl:element>
  </xsl:template>

  <!-- choice with abbr,sic,orig/expan,corr,reg -->
  <!-- just ensure there is a space before orig/expan/corr-->
  <xsl:template match="tei:orig | tei:expan | tei:corr">
    <xsl:text> </xsl:text>
    <xsl:apply-templates />
  </xsl:template>
  <!-- CSS: span.choice
        <span class="choice" [title="expan/corr/reg"]>... except expan/corr/reg</span>
    -->
  <xsl:template match="tei:choice">
    <span>
      <xsl:attribute name="class">choice</xsl:attribute>
      <xsl:variable name="t" select="tei:expan | tei:corr | tei:reg" />
      <xsl:if test="$t">
        <xsl:attribute name="title">
          <!-- select the whole element $t rather than its text() node
                         because text() refers to direct child nodes only, and
                         expan etc might include other elements like foreign. -->
          <xsl:value-of select="normalize-space($t)" />
        </xsl:attribute>
      </xsl:if>
      <xsl:apply-templates
        select="node()[not(self::tei:expan or self::tei:corr or self::tei:reg)] | @*" />
    </span>
  </xsl:template>

  <!-- footnote reference: this renders only the embedded reference -->
  <!--
        <sup><a href="fn@n"></a></sup>
    -->
  <xsl:template match="tei:note[@type='footnote']">
    <sup>
      <xsl:element name="a">
        <xsl:attribute name="href">
          <xsl:text>#fn</xsl:text>
          <xsl:value-of select="@n" />
        </xsl:attribute>
        <sup>
          <xsl:value-of select="@n" />
        </sup>
      </xsl:element>
    </sup>
  </xsl:template>
  <!-- footnote content (full mode): this renders the target footnote -->
  <!--
        <div class="footnote">
            <a name="fn@n"></a>
            <sup>@n</sup>
            ...
        </div>
    -->
  <xsl:template match="tei:note[@type='footnote']" mode="full">
    <div class="footnote">
      <xsl:element name="a">
        <xsl:attribute name="name">
          <xsl:text>fn</xsl:text>
          <xsl:value-of select="@n" />
        </xsl:attribute>
      </xsl:element>
      <sup>
        <xsl:value-of select="@n" />
      </sup>
      <xsl:apply-templates />
    </div>
  </xsl:template>

  <!-- HEADER -->
  <!-- teiHeader: drop -->
  <xsl:template match="tei:teiHeader" />

  <!-- idno -->
  <!--
        <li class="idno">
          <a target="_blank" href="textValue">...</a> if textValue starts with http
          ... else
        </li>
    -->
  <xsl:template match="tei:idno">
    <li class="idno">
      <xsl:choose>
        <!-- a URI even if specified as attribute would not necessarily
                     be a URL, so test for http -->
        <xsl:when test="starts-with(., 'http')">
          <xsl:element name="a">
            <xsl:attribute name="target">_blank</xsl:attribute>
            <xsl:attribute name="href">
              <xsl:value-of select="." />
            </xsl:attribute>
            <xsl:apply-templates />
          </xsl:element>
        </xsl:when>
        <xsl:otherwise>
          <xsl:apply-templates />
        </xsl:otherwise>
      </xsl:choose>
    </li>
  </xsl:template>

  <!-- link -->
  <!--
        <li class="link">
            <a target="_blank" href="@target">@type or "link"</a>
        </li>
    -->
  <xsl:template match="tei:link">
    <li class="link">
      <xsl:element name="a">
        <xsl:attribute name="target">_blank</xsl:attribute>
        <xsl:attribute name="href">
          <xsl:value-of select="@target" />
        </xsl:attribute>
        <xsl:choose>
          <xsl:when test="@type">
            <xsl:value-of select="@type" />
          </xsl:when>
          <xsl:otherwise>link</xsl:otherwise>
        </xsl:choose>
        <xsl:apply-templates />
      </xsl:element>
    </li>
  </xsl:template>

  <!-- listPerson -->
  <!-- CSS: span.nr
        for each person, sorted by surname, forename:
        <li>
            <a name="@xml:id"></a>
            ... for persName: <span class="nr">count</span>
            if idno:
            <ul>for each idno: ... for .</ul>
            if link:
            <ol>for each link: ... for .</ol>
        </li>
    -->
  <xsl:template match="tei:listPerson">
    <ol>
      <xsl:for-each select="tei:person">
        <xsl:sort select="tei:persName/tei:surname" />
        <xsl:sort select="tei:persName/tei:forename" />
        <li>
          <xsl:element name="a">
            <xsl:attribute name="name">
              <xsl:value-of select="@xml:id" />
            </xsl:attribute>
          </xsl:element>
          <xsl:apply-templates select="tei:persName" />
          <!-- count -->
          <xsl:variable name="pid" select="concat('#', @xml:id)" />
          <xsl:text>: </xsl:text>
          <span class="nr">
            <xsl:value-of
              select="
                                count(//tei:body//tei:persName[@ref = $pid]) +
                                count(//tei:body//tei:name[@ref = $pid])"
            />
          </span>
          <!-- idno -->
          <xsl:if test="tei:idno">
            <ul>
              <xsl:for-each select="tei:idno">
                <xsl:apply-templates select="." />
              </xsl:for-each>
            </ul>
          </xsl:if>
          <!-- link -->
          <xsl:if test="tei:link">
            <ol>
              <xsl:for-each select="tei:link">
                <xsl:apply-templates select="." />
              </xsl:for-each>
            </ol>
          </xsl:if>
        </li>
      </xsl:for-each>
    </ol>
  </xsl:template>

  <!-- listOrg -->
  <!-- CSS: span.nr
        for each org, sorted by name:
        <li>
            <a name="@xml:id"></a>
            ... for orgName: <span class="nr">count</span>
            if idno:
            <ul>for each idno: ... for .</ul>
            if link:
            <ol>for each link: ... for .</ol>
        </li>
    -->
  <xsl:template match="tei:listOrg">
    <ol>
      <xsl:for-each select="tei:org">
        <xsl:sort select="tei:orgName" />
        <li>
          <xsl:element name="a">
            <xsl:attribute name="name">
              <xsl:value-of select="@xml:id" />
            </xsl:attribute>
          </xsl:element>
          <xsl:apply-templates select="tei:orgName" />
          <!-- count -->
          <xsl:variable name="pid" select="concat('#', @xml:id)" />
          <xsl:text>: </xsl:text>
          <span class="nr">
            <xsl:value-of
              select="
                                count(//tei:body//tei:orgName[@ref = $pid]) +
                                count(//tei:body//tei:name[@ref = $pid])"
            />
          </span>
          <!-- idno -->
          <xsl:if test="tei:idno">
            <ul>
              <xsl:for-each select="tei:idno">
                <xsl:apply-templates select="." />
              </xsl:for-each>
            </ul>
          </xsl:if>
          <!-- link -->
          <xsl:if test="tei:link">
            <ol>
              <xsl:for-each select="tei:link">
                <xsl:apply-templates select="." />
              </xsl:for-each>
            </ol>
          </xsl:if>
        </li>
      </xsl:for-each>
    </ol>
  </xsl:template>

  <!-- listPlace -->
  <!-- CSS: span.nr
        for each place, sorted by place, placeName, geogName:
        <li>
            <a name="@xml:id"></a>
            ... for place/placeName/geogName: <span class="nr">count</span>
            if idno:
            <ul>for each idno: ... for .</ul>
            if link:
            <ol>for each link: ... for .</ol>
        </li>
    -->
  <xsl:template match="tei:listPlace">
    <ol>
      <xsl:for-each select="tei:place">
        <xsl:sort select="tei:placeName" />
        <xsl:sort select="tei:geogName" />
        <li>
          <xsl:element name="a">
            <xsl:attribute name="name">
              <xsl:value-of select="@xml:id" />
            </xsl:attribute>
          </xsl:element>
          <xsl:apply-templates select="tei:place | tei:placeName | tei:geogName" />
          <!-- count -->
          <xsl:variable name="pid" select="concat('#', @xml:id)" />
          <xsl:text>: </xsl:text>
          <span class="nr">
            <xsl:value-of
              select="
                                count(//tei:body//tei:placeName[@ref = $pid]) +
                                count(//tei:body//tei:geogName[@ref = $pid]) +
                                count(//tei:body//tei:name[@ref = $pid])"
            />
          </span>
          <!-- idno -->
          <xsl:if test="tei:idno">
            <ul>
              <xsl:for-each select="tei:idno">
                <xsl:apply-templates select="." />
              </xsl:for-each>
            </ul>
          </xsl:if>
          <!-- link -->
          <xsl:if test="tei:link">
            <ol>
              <xsl:for-each select="tei:link">
                <xsl:apply-templates select="." />
              </xsl:for-each>
            </ol>
          </xsl:if>
        </li>
      </xsl:for-each>
    </ol>
  </xsl:template>

  <!-- TEI -->
  <xsl:template match="/tei:TEI">
    <html>
      <head>
        <title>TEI Sample</title>
        <style>
          body {
          font-family: sans-serif;
          margin: 16px;
          background-color: rgb(240, 240, 240);
          }
          blockquote {
          text-align: center;
          font-size: 1.1em;
          }
          cite {
          font-family: serif;
          font-style: italic;
          font-size: 1.2em;
          color: rgb(195, 67, 193);
          }
          div.footnote {
          margin: 8px;
          font-size: 0.9em;
          }
          div.head {
          border-top: 1px solid silver;
          margin-top: 16px;
          margin-bottom: 8px;
          color: royalblue;
          }
          div.opener {
          border-bottom: 1px solid silver;
          margin-bottom: 6px;
          }
          div.closer {
          border-top: 1px solid silver;
          margin-top: 6px;
          }
          figure {
          border: 1px solid silver;
          border-radius: 4px;
          padding: 6px;
          }
          figure div.head {
          margin: 0;
          border: none;
          }
          figcaption {
          font-size: 0.8em;
          }
          h2 {
          color: ;
          }
          h2.main {
          font-size: 1.2em;
          }
          h2.desc {
          font-weight: italic;
          font-size: 1em;
          }
          .name {
          color: #F37748;
          }
          .persName {
          color: #F37748;
          }
          .geogName,
          .placeName {
          color: #7FB069;
          }
          .orgName {
          color: #073B4C;
          }
          a.name,
          a.name:visited {
          color: #F37748;
          text-decoration: none;
          }
          a.name:hover {
          text-decoration: underline;
          }
          section#header {
          color: grey;
          }
          span.pb {
          color: yellow;
          border: 1px solid yellow;
          border-radius: 4px;
          padding: 4px;
          margin: 0 6px;
          background-color: #e6e3cc;
          }
          span.super {
          vertical-align: super;
          font-size: smaller;
          }
          span.bibl {
          color: #056e50;
          }
          span.idno {
          color: #6e2305;
          }
          span.num,
          span.measure {
          color: #0d676e;
          }
          span.date,
          span.time {
          color: #6e3c0d;
          }
          span.ref {
          color: #0d526e;
          }
          span.said {
          font-style: italic;
          }
          span.aloud {
          font-variant-caps: small-caps;
          }
          address {
          margin: 16px 8px;
          border: 1px solid silver;
          border-radius: 4px;
          padding: 4px;
          max-width: 400px;
          }
          span.foreign,
          span.distinct {
          color: #631b55;
          }
          span.ed {
          color: silver;
          font-style: italic;
          margin: 0 8px;
          border: 1px solid silver;
          border-radius: 4px;
          padding: 4px;
          }
          span.unclear {
          text-decoration-line: underline;
          text-decoration-style: wavy;
          }
          span.del {
          text-decoration: line-through;
          }
          span.choice {
          text-decoration: underline;
          text-decoration-style: dotted;
          }
          span.nr {
          font-weight: bold;
          }
          span.term {
          font-style: italic;
          }
          span.title {
          font-style: italic;
          }</style>
      </head>
      <body>
        <h1>TEI Sample</h1>
        <xsl:apply-templates />
        <!-- footnotes -->
        <h2>Notes</h2>
        <xsl:for-each select=".//tei:note[@type='footnote']">
          <xsl:sort select="@n" />
          <xsl:apply-templates select="." mode="full" />
        </xsl:for-each>
        <!-- toc -->
        <h2>Table of Contents</h2>
        <ol>
          <xsl:for-each select="//tei:head/tei:title[@n]">
            <li>
              <xsl:element name="a">
                <xsl:attribute name="href">
                  <xsl:text>#h_</xsl:text>
                  <xsl:value-of select="@n" />
                </xsl:attribute>
                <xsl:value-of select="." />
              </xsl:element>
            </li>
          </xsl:for-each>
        </ol>
        <!-- lists -->
        <hr />
        <xsl:if test="tei:teiHeader//tei:listPerson">
          <h2>Persons</h2>
          <xsl:apply-templates select="tei:teiHeader//tei:listPerson" />
        </xsl:if>
        <xsl:if test="tei:teiHeader//tei:listOrg">
          <h2>Organizations</h2>
          <xsl:apply-templates select="tei:teiHeader//tei:listOrg" />
        </xsl:if>
        <xsl:if test="tei:teiHeader//tei:listPlace">
          <h2>Places</h2>
          <xsl:apply-templates select="tei:teiHeader//tei:listPlace" />
        </xsl:if>
      </body>
    </html>
  </xsl:template>
</xsl:stylesheet>
