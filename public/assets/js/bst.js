export class BinarySearchTree {
  constructor() {
    this.root = null;
  }

  makeKey(score, scoreAchievedAt, id, username) {
    return { score, scoreAchievedAt, id, username };
  }

  compareKeys(a, b) {
    if (a.score !== b.score) {
      return a.score - b.score;
    }

    if (a.scoreAchievedAt !== b.scoreAchievedAt) {
      return a.scoreAchievedAt < b.scoreAchievedAt ? 1 : -1;
    }

    return 0;
  }

  insert(player) {
    const node = {
      key: this.makeKey(player.score, player.scoreAchievedAt, player.id, player.username),
      player,
      left: null,
      right: null,
      parent: null,
      x: 0,
      y: 0,
    };

    if (this.root === null) {
      this.root = node;
      return node;
    }

    let current = this.root;
    let parent = null;
    while (current) {
      parent = current;
      const cmp = this.compareKeys(node.key, current.key);
      if (cmp < 0) {
        current = current.left;
      } else if (cmp > 0) {
        current = current.right;
      } else {
        current.player = player;
        return current;
      }
    }

    node.parent = parent;
    if (this.compareKeys(node.key, parent.key) < 0) {
      parent.left = node;
    } else {
      parent.right = node;
    }

    return node;
  }

  findNode(key) {
    let current = this.root;
    while (current) {
      const cmp = this.compareKeys(key, current.key);
      if (cmp === 0) {
        return current;
      }
      current = cmp < 0 ? current.left : current.right;
    }
    return null;
  }

  transplant(u, v) {
    if (!u.parent) {
      this.root = v;
    } else if (u === u.parent.left) {
      u.parent.left = v;
    } else {
      u.parent.right = v;
    }
    if (v) {
      v.parent = u.parent;
    }
  }

  minimum(node) {
    let current = node;
    while (current && current.left) {
      current = current.left;
    }
    return current;
  }

  delete(key) {
    const z = this.findNode(key);
    if (!z) {
      return false;
    }

    if (!z.left) {
      this.transplant(z, z.right);
    } else if (!z.right) {
      this.transplant(z, z.left);
    } else {
      const y = this.minimum(z.right);
      if (y && y.parent !== z) {
        this.transplant(y, y.right);
        y.right = z.right;
        if (y.right) {
          y.right.parent = y;
        }
      }
      this.transplant(z, y);
      if (y) {
        y.left = z.left;
        if (y.left) {
          y.left.parent = y;
        }
      }
    }

    return true;
  }

  inOrder(node = this.root, collector = []) {
    if (!node) {
      return collector;
    }

    this.inOrder(node.left, collector);
    collector.push(node.player);
    this.inOrder(node.right, collector);
    return collector;
  }

  reverseInOrder(node = this.root, collector = []) {
    if (!node) {
      return collector;
    }

    this.reverseInOrder(node.right, collector);
    collector.push(node.player);
    this.reverseInOrder(node.left, collector);
    return collector;
  }

  assignPositions(width = 1400, levelHeight = 100) {
    let order = 0;

    const traverse = (node, depth) => {
      if (!node) {
        return;
      }

      traverse(node.left, depth + 1);
      order += 1;
      node.x = (order / (Math.max(1, this.countNodes()) + 1)) * width;
      node.y = 70 + depth * levelHeight;
      traverse(node.right, depth + 1);
    };

    traverse(this.root, 0);
  }

  countNodes(node = this.root) {
    if (!node) {
      return 0;
    }
    return 1 + this.countNodes(node.left) + this.countNodes(node.right);
  }

  edges(node = this.root, collector = []) {
    if (!node) {
      return collector;
    }

    if (node.left) {
      collector.push([node, node.left]);
      this.edges(node.left, collector);
    }
    if (node.right) {
      collector.push([node, node.right]);
      this.edges(node.right, collector);
    }

    return collector;
  }

  nodes(node = this.root, collector = []) {
    if (!node) {
      return collector;
    }

    this.nodes(node.left, collector);
    collector.push(node);
    this.nodes(node.right, collector);
    return collector;
  }
}
