export class FileExplorer {
  constructor(app) {
    this.app = app;
    this.fileTree = new Map();
    this.expandedFolders = new Set();
  }

  async loadFileTree(rootPath) {
    if (!rootPath) return;

    try {
      const items = await window.electronAPI.fs.readDir(rootPath);
      this.renderFileTree(items, rootPath);
    } catch (error) {
      console.error('Failed to load file tree:', error);
    }
  }

  renderFileTree(items, parentPath, parentElement = null, depth = 0) {
    const container = parentElement || document.getElementById('file-tree');
    
    if (!parentElement) {
      container.innerHTML = '';
    }

    items.sort((a, b) => {
      // Folders first, then files
      if (a.isDirectory !== b.isDirectory) {
        return a.isDirectory ? -1 : 1;
      }
      return a.name.localeCompare(b.name);
    });

    items.forEach(item => {
      const itemElement = this.createFileItem(item, depth);
      container.appendChild(itemElement);
    });
  }

  createFileItem(item, depth) {
    const itemElement = document.createElement('div');
    itemElement.className = 'file-item';
    itemElement.style.paddingLeft = `${depth * 16 + 8}px`;
    
    if (item.isDirectory) {
      const toggle = document.createElement('button');
      toggle.className = 'folder-toggle';
      toggle.innerHTML = '▶';
      toggle.addEventListener('click', (e) => {
        e.stopPropagation();
        this.toggleFolder(item.path, itemElement, depth);
      });
      itemElement.appendChild(toggle);
    }

    const icon = document.createElement('div');
    icon.className = 'file-icon';
    icon.innerHTML = this.getFileIcon(item);
    itemElement.appendChild(icon);

    const name = document.createElement('div');
    name.className = 'file-name';
    name.textContent = item.name;
    itemElement.appendChild(name);

    // Add click handler
    itemElement.addEventListener('click', () => {
      if (item.isFile) {
        this.app.openFileInEditor(item.path);
      }
    });

    // Add context menu
    itemElement.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      this.showContextMenu(e, item);
    });

    return itemElement;
  }

  getFileIcon(item) {
    if (item.isDirectory) {
      return '<svg width="16" height="16" viewBox="0 0 16 16"><path fill="#dcb67a" d="M2 3.5A1.5 1.5 0 0 1 3.5 2h2.879a1.5 1.5 0 0 1 1.06.44l1.122 1.12A.5.5 0 0 0 9.06 4H12.5A1.5 1.5 0 0 1 14 5.5v8a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 2 13.5v-10z"/></svg>';
    }

    // File type specific icons
    const extension = item.name.split('.').pop().toLowerCase();
    const iconColors = {
      js: '#f7df1e',
      ts: '#3178c6',
      py: '#3776ab',
      rs: '#dea584',
      go: '#00add8',
      java: '#ed8b00',
      html: '#e34c26',
      css: '#1572b6',
      json: '#000000',
      md: '#083fa1'
    };

    const color = iconColors[extension] || '#c5c5c5';
    return `<svg width="16" height="16" viewBox="0 0 16 16"><path fill="${color}" d="M4 0h5.293L14 4.707V14a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V2a2 2 0 0 1 2-2zm5.5 1.5v2a.5.5 0 0 0 .5.5h2l-2.5-2.5z"/></svg>`;
  }

  async toggleFolder(folderPath, folderElement, depth) {
    const toggle = folderElement.querySelector('.folder-toggle');
    const isExpanded = this.expandedFolders.has(folderPath);

    if (isExpanded) {
      // Collapse folder
      this.expandedFolders.delete(folderPath);
      toggle.innerHTML = '▶';
      
      // Remove child elements
      let nextSibling = folderElement.nextElementSibling;
      while (nextSibling && parseInt(nextSibling.style.paddingLeft) > depth * 16 + 8) {
        const toRemove = nextSibling;
        nextSibling = nextSibling.nextElementSibling;
        toRemove.remove();
      }
    } else {
      // Expand folder
      this.expandedFolders.add(folderPath);
      toggle.innerHTML = '▼';
      
      try {
        const items = await window.electronAPI.fs.readDir(folderPath);
        const fragment = document.createDocumentFragment();
        
        items.sort((a, b) => {
          if (a.isDirectory !== b.isDirectory) {
            return a.isDirectory ? -1 : 1;
          }
          return a.name.localeCompare(b.name);
        });

        items.forEach(item => {
          const itemElement = this.createFileItem(item, depth + 1);
          fragment.appendChild(itemElement);
        });

        // Insert after the folder element
        folderElement.parentNode.insertBefore(fragment, folderElement.nextSibling);
      } catch (error) {
        console.error('Failed to expand folder:', error);
      }
    }
  }

  showContextMenu(event, item) {
    // Simple context menu implementation
    const menu = document.createElement('div');
    menu.className = 'context-menu';
    menu.style.position = 'fixed';
    menu.style.left = `${event.clientX}px`;
    menu.style.top = `${event.clientY}px`;
    menu.style.background = 'var(--bg-tertiary)';
    menu.style.border = '1px solid var(--border-color)';
    menu.style.borderRadius = '4px';
    menu.style.padding = '4px 0';
    menu.style.zIndex = '1000';

    if (item.isFile) {
      menu.innerHTML = `
        <div class="context-menu-item" data-action="open">Open</div>
        <div class="context-menu-item" data-action="delete">Delete</div>
        <div class="context-menu-item" data-action="rename">Rename</div>
      `;
    } else {
      menu.innerHTML = `
        <div class="context-menu-item" data-action="new-file">New File</div>
        <div class="context-menu-item" data-action="new-folder">New Folder</div>
        <div class="context-menu-item" data-action="delete">Delete</div>
        <div class="context-menu-item" data-action="rename">Rename</div>
      `;
    }

    // Add click handlers
    menu.addEventListener('click', (e) => {
      const action = e.target.dataset.action;
      this.handleContextMenuAction(action, item);
      menu.remove();
    });

    // Remove menu when clicking elsewhere
    setTimeout(() => {
      document.addEventListener('click', () => menu.remove(), { once: true });
    }, 0);

    document.body.appendChild(menu);
  }

  handleContextMenuAction(action, item) {
    switch (action) {
      case 'open':
        if (item.isFile) {
          this.app.openFileInEditor(item.path);
        }
        break;
      case 'delete':
        if (confirm(`Are you sure you want to delete ${item.name}?`)) {
          // In a real app, implement file deletion
          console.log('Delete:', item.path);
        }
        break;
      case 'rename':
        const newName = prompt('Enter new name:', item.name);
        if (newName && newName !== item.name) {
          // In a real app, implement file renaming
          console.log('Rename:', item.path, 'to', newName);
        }
        break;
      case 'new-file':
        const fileName = prompt('Enter file name:');
        if (fileName) {
          // In a real app, create new file
          console.log('Create file:', fileName, 'in', item.path);
        }
        break;
      case 'new-folder':
        const folderName = prompt('Enter folder name:');
        if (folderName) {
          // In a real app, create new folder
          console.log('Create folder:', folderName, 'in', item.path);
        }
        break;
    }
  }

  refresh() {
    if (this.app.currentWorkspace) {
      this.loadFileTree(this.app.currentWorkspace);
    }
  }
}