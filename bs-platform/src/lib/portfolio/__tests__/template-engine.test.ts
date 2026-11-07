import { describe, it, expect } from 'vitest'
import { renderTemplate } from '@/lib/portfolio/template-engine'
import { sanitizeTemplateHtml, splitTemplate } from '@/lib/portfolio/template-sanitize'

describe('renderTemplate', () => {
  it('escapes user values so profile data cannot inject markup', () => {
    const out = renderTemplate('<h1>{{name}}</h1>', {
      name: '<img src=x onerror="alert(1)">',
    })
    expect(out).toBe('<h1>&lt;img src=x onerror=&quot;alert(1)&quot;&gt;</h1>')
  })

  it('renders each blocks over primitives and objects', () => {
    const out = renderTemplate('{{#each skills}}<li>{{.}}</li>{{/each}}', {
      skills: ['Excel', 'إدارة'],
    })
    expect(out).toBe('<li>Excel</li><li>إدارة</li>')

    const jobs = renderTemplate('{{#each experience}}{{title}}@{{company}};{{/each}}', {
      experience: [
        { title: 'Analyst', company: 'Acme' },
        { title: 'Lead', company: 'Beta' },
      ],
    })
    expect(jobs).toBe('Analyst@Acme;Lead@Beta;')
  })

  it('supports if/else and nesting', () => {
    const ctx = { bio: '', skills: ['a'] }
    expect(renderTemplate('{{#if bio}}yes{{else}}no{{/if}}', ctx)).toBe('no')
    expect(
      renderTemplate('{{#if skills}}{{#each skills}}[{{.}}]{{/each}}{{/if}}', ctx)
    ).toBe('[a]')
  })

  it('renders unknown tags as empty and survives an unbalanced block', () => {
    expect(renderTemplate('a{{missing}}b', {})).toBe('ab')
    expect(renderTemplate('a{{#if x}}b', { x: true })).toBe('a')
  })

  it('numbers each item from 1', () => {
    expect(renderTemplate('{{#each skills}}{{@index}}.{{.}} {{/each}}', { skills: ['x', 'y'] })).toBe(
      '1.x 2.y '
    )
  })
})

describe('sanitizeTemplateHtml', () => {
  it('strips scripts, handlers, iframes and javascript: urls', () => {
    const dirty = `<div onclick="steal()"><script>fetch('/x')</script><iframe src="//evil"></iframe><a href="javascript:alert(1)">x</a></div>`
    const clean = sanitizeTemplateHtml(dirty)
    expect(clean).not.toMatch(/<script/i)
    expect(clean).not.toMatch(/onclick/i)
    expect(clean).not.toMatch(/<iframe/i)
    expect(clean).not.toMatch(/javascript:/i)
  })

  it('turns forms into plain containers', () => {
    expect(sanitizeTemplateHtml('<form action="/x"><b>hi</b></form>')).toBe(
      '<div action="/x"><b>hi</b></div>'
    )
  })
})

describe('splitTemplate', () => {
  it('separates styles from body markup', () => {
    const { css, body } = splitTemplate(
      '<!DOCTYPE html><html><head><style>.a{color:red}</style></head><body><main>hi</main></body></html>'
    )
    expect(css).toContain('.a{color:red}')
    expect(body).toBe('<main>hi</main>')
  })

  it('falls back to the whole fragment when there is no body tag', () => {
    expect(splitTemplate('<section>hello</section>').body).toBe('<section>hello</section>')
  })
})
