<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
    xmlns:tei="http://www.tei-c.org/ns/1.0" version="1.0">
    <xsl:output method="html" indent="yes" />
    <!-- remove WS only text nodes -->
    <xsl:strip-space elements="*" />

    <!-- root -->
    <xsl:template match="/">
        <html>
            <head>
                <style>
                    body {
                    font-family: sans-serif;
                    margin: 16px;
                    background-color: rgb(240, 240, 240);
                    }
                    h2 {
                    font-size: 1.2em;
                    color: royalblue;
                    }
                    p {
                    line-height: 1.5;
                    }
                    .super {
                    vertical-align: super;
                    font-size: 0.7em;
                    }
                    .muted {
                    color: silver;
                    }
                    .pb {
                    font-size: 0.8em;
                    color: white;
                    background-color: #d1a715;
                    margin: 0 6px;
                    }
                    .s {
                    vertical-align: super;
                    font-size: 0.7em;
                    color: silver;
                    margin: 0 4px;
                    border-left: 1px solid silver;
                    border-top: 1px solid silver;
                    }
                    div#container {
                    display:grid;
                    grid-template-rows: auto;
                    grid-template-columns: 1fr 1fr;
                    grid-template-areas:
                    "trc trl";
                    gap: 16px;
                    }
                    article#trc {
                    grid-area: trc;
                    }
                    article#trl {
                    grid-area: trl;
                    }
                    @media only screen and (max-width: 959px) {
                    div#container {
                    grid-template-columns: 1fr;
                    grid-template-areas:
                    "trc"
                    "trl";
                    }
                    }
                </style>
            </head>
            <body>
                <xsl:apply-templates />
                <!-- lists -->
                <hr />
                <xsl:if test="//tei:listPerson">
                    <h2>Persons</h2>
                    <xsl:apply-templates select="//tei:listPerson" />
                </xsl:if>
                <xsl:if test="//tei:listPlace">
                    <h2>Places</h2>
                    <xsl:apply-templates select="//tei:listPlace" />
                </xsl:if>
            </body>
        </html>
    </xsl:template>

    <!-- body -->
    <xsl:template match="tei:body">
        <div id="container">
            <xsl:apply-templates />
        </div>
    </xsl:template>

    <!-- lb -->
    <xsl:template match="tei:lb">
        <br />
    </xsl:template>

    <!-- pb > span.pb with span.super @n or rectangle -->
    <xsl:template match="tei:pb">
        <span class="pb">
            <xsl:choose>
                <xsl:when test="@n">
                    <xsl:value-of select="@n" />
                </xsl:when>
                <xsl:otherwise> &#x25ae; </xsl:otherwise>
            </xsl:choose>
        </span>
    </xsl:template>

    <!-- s -->
    <xsl:template match="tei:s">
        <span class="s">
            <xsl:value-of select="@xml:id" />
        </span>
        <xsl:apply-templates />
    </xsl:template>

    <!-- ab -->
    <xsl:template match="tei:ab | tei:p">
        <p>
            <xsl:apply-templates />
        </p>
    </xsl:template>

    <!-- div[type='transcription'] -->
    <xsl:template match="tei:div[@type='transcription']">
        <article id="trc">
            <h2>Transcription</h2>
            <div>
                <xsl:apply-templates />
            </div>
        </article>
    </xsl:template>

    <!-- div[type='translation'] -->
    <xsl:template match="tei:div[@type='translation']">
        <article id="trl">
            <h2>Translation</h2>
            <div>
                <xsl:apply-templates />
            </div>
        </article>
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

    <!-- figure -->
    <!--
        <figure>...</figure>
    -->
    <xsl:template match="tei:figure">
        <figure>
            <xsl:apply-templates/>
        </figure>
    </xsl:template>

    <!-- graphic -->
    <!--
        <img src="@url" alt="figDesc">
    -->
    <xsl:template match="tei:graphic">
        <xsl:element name="img">
            <xsl:attribute name="src">
                <xsl:value-of select="@url"/>
            </xsl:attribute>
            <xsl:if test="following-sibling::tei:figDesc">
                <xsl:attribute name="alt">
                    <xsl:value-of select="normalize-space(following-sibling::tei:figDesc)"/>
                </xsl:attribute>
            </xsl:if>
        </xsl:element>
    </xsl:template>

    <!-- graphic with a desc child -->
    <!--
        <img src="@url" alt="desc">
    -->
    <xsl:template match="tei:graphic[tei:desc]">
        <xsl:element name="img">
            <xsl:attribute name="src">
                <xsl:value-of select="@url"/>
            </xsl:attribute>
            <xsl:attribute name="alt">
                <xsl:value-of select="normalize-space(tei:desc)"/>
            </xsl:attribute>
        </xsl:element>
    </xsl:template>

    <!-- figDesc -->
    <!--
        <figcaption>...</figcaption>
    -->
    <xsl:template match="tei:figDesc">
        <figcaption>
            <xsl:apply-templates/>
        </figcaption>
    </xsl:template>

    <!-- ================================================================== -->
    <!-- HEADER -->
    <!-- ================================================================== -->
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
                        <xsl:attribute name="rel">noopener</xsl:attribute>
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
    <xsl:template match="tei:teiHeader//tei:link">
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

</xsl:stylesheet>
